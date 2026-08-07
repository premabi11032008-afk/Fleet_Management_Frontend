import React, { useState, useRef, useEffect } from 'react';
import { addDriver, addVehicle, getRoutePath, assignRoute, getVehicles, getDrivers } from '../api/apiEndpoints';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your Fleet AI Assistant. You can ask me to add a driver, add a vehicle, find a route, or auto-dispatch a vehicle.", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const newHistory = [...messages, { text: userMessage, sender: 'user' }];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Call the AI Intent Parser Webhook
      const aiWebhookUrl = import.meta.env.VITE_CHATBOT_WEBHOOK_URL;

      // Limit history to the last 10 messages to prevent context overflow
      const chatHistory = newHistory.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // Fetch live fleet state to provide context to the LLM (caching makes this fast)
      const allVehicles = await getVehicles();
      const allDrivers = await getDrivers();

      const systemContext = {
        availableVehicles: allVehicles.filter(v => v.status === 'Idle').map(v => ({ id: v.id || v._id, make: v.make, model: v.model, plate: v.plate })),
        allDrivers: allDrivers.map(d => ({ id: d.id || d._id, name: d.name, username: d.username }))
      };

      const response = await fetch(aiWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistory, message: userMessage, systemContext })
      });

      if (!response.ok) {
        throw new Error('AI Webhook failed');
      }

      const data = await response.json();

      // Handle n8n standard output format
      const intentData = data.body || (data.items && data.items[0] && data.items[0].json) || data;

      let intentObj = {};
      try {
        // Sometimes n8n returns a stringified JSON body
        let parsed = typeof intentData === 'string' ? JSON.parse(intentData) : intentData;

        // AgentBuilder puts the LLM output in the 'response' property as a string
        if (parsed && parsed.response && typeof parsed.response === 'string') {
          try {
            // Attempt to parse the inner JSON string from 'response'
            parsed = JSON.parse(parsed.response.replace(/```json/g, '').replace(/```/g, '').trim());
          } catch (e) {
            // If it fails, keep the original parsed object
            console.warn("Could not parse inner response as JSON", e);
          }
        }

        // If it's still a string (double encoded), parse again
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        intentObj = parsed;
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        intentObj = { reply: "I'm sorry, I received an invalid response from the AI." };
      }

      const intent = intentObj.intent || 'chat';
      const parameters = intentObj.parameters || {};
      const reply = intentObj.reply || intentObj.response || intentObj.message || '';

      let botReply = reply || '';

      // Geocoding helper to ensure Leaflet gets [lat, lng] arrays instead of strings
      const geocodeLocation = async (loc) => {
        if (Array.isArray(loc)) return loc;
        if (!loc || typeof loc !== 'string') return null;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`);
          const data = await res.json();
          if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        } catch (e) {
          console.error("Geocoding failed", e);
        }
        return loc; // fallback
      };

      // 2. Execute Backend API calls based on intent
      if (intent === 'addDriver' && parameters) {
        try {
          const newDriver = await addDriver({
            name: parameters.name,
            licenseNumber: parameters.licenseNumber || 'PENDING'
          });
          botReply = (reply ? reply + "\n\n" : "");
        } catch (e) {
          botReply = "Sorry, I couldn't add the driver at this moment.";
        }
      } else if (intent === 'addVehicle' && parameters) {
        try {
          const newVehicle = await addVehicle({
            make: parameters.make || 'Unknown Make',
            model: parameters.model || 'Unknown Model',
            plate: parameters.plate || 'PENDING',
            year: parameters.year || new Date().getFullYear(),
            vin: parameters.vin || 'PENDING'
          });
          botReply = (reply ? reply + "\n\n" : "");
        } catch (e) {
          botReply = "Sorry, I couldn't add the vehicle at this moment.";
        }
      } else if (intent === 'getRoutePath' && parameters) {
        try {
          const start = await geocodeLocation(parameters.startCoords);
          const end = await geocodeLocation(parameters.endCoords);
          const routes = await getRoutePath(start, end);
          const route = routes && Array.isArray(routes) ? routes[0] : routes;
          if (route && route.points) {
            const distKm = (route.distance / 1000).toFixed(1);
            const timeMin = Math.round(route.duration / 60);
            botReply = (reply ? reply + "\n\n" : "") + `Approximate distance: ${distKm} km, Est. time: ${timeMin} mins. Details are on the map.`;
          } else {
            botReply = (reply ? reply + "\n\n" : "");
          }
        } catch (e) {
          botReply = "Sorry, I couldn't calculate the route.";
        }
      } else if (intent === 'assignRoute' && parameters) {
        try {
          const start = await geocodeLocation(parameters.startCoords);
          const end = await geocodeLocation(parameters.endCoords);
          const routes = await getRoutePath(start, end);
          const route = routes && Array.isArray(routes) ? routes[0] : routes;
          await assignRoute(parameters.vehicleId, parameters.driverId, start, end);
          if (route && route.distance > 0) {
            const distKm = (route.distance / 1000).toFixed(1);
            const timeMin = Math.round(route.duration / 60);
            botReply = (reply ? reply + "\n\n" : "") + `✅ Route successfully assigned and vehicle dispatched! (Distance: ${distKm} km, Est: ${timeMin} mins)`;
          } else {
            botReply = (reply ? reply + "\n\n" : "") + `✅ Route successfully assigned and vehicle dispatched!`;
          }
        } catch (e) {
          botReply = "Sorry, I couldn't assign the route right now.";
        }
      }

      // 3. Fallback if no intent matched and no reply provided
      if (!botReply) {
        botReply = "I didn't quite understand that.";
      }

      setMessages(prev => [...prev, { text: botReply, sender: 'bot' }]);
    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting right now.", sender: 'bot', error: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="chatbot-toggle" onClick={() => setIsOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10-1.66 0-3.218-.41-4.58-1.129L2 22l1.129-5.42C2.41 15.218 2 13.66 2 12 2 6.477 6.477 2 12 2z"></path><path d="M8 12h.01"></path><path d="M12 12h.01"></path><path d="M16 12h.01"></path></svg>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-indicator"></span>
              Fleet AI Assistant
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.sender} ${msg.error ? 'error' : ''}`}>
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble bot typing">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={!input.trim() || isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
