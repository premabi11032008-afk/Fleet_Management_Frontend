# Intelligent Fleet Management System (IFMS)

Welcome to the **Intelligent Fleet Management System**, a modern, highly responsive web application designed for fleet managers to efficiently track vehicles, manage drivers, assign dispatch routes, and monitor live fleet statistics. 

This repository contains the **Frontend** application, built with React and Vite. It integrates seamlessly with our unique, low-code **n8n Webhook Architecture** for all backend operations and AI intent parsing.

---

## 🏗️ System Design & Architecture

The IFMS utilizes a highly decoupled, serverless-style architecture leveraging an intelligent API Gateway pattern.

### 1. The Frontend (Client Layer)
- **Framework:** React + Vite
- **Styling:** Vanilla CSS with custom design tokens for a premium, glassmorphism UI.
- **Mapping:** `react-leaflet` combined with OpenStreetMap tiles for interactive dispatching and live route visualization.
- **Performance Strategy:** 
  - **Aggressive Local Caching:** The frontend heavily utilizes an in-memory cache and `localStorage`. When a fleet manager requests a route that was previously calculated, the frontend serves it instantly from the cache, achieving a true "zero-latency" feel without hitting the backend.
  - **Optimistic UI:** Vehicle and driver statuses update optimistically on the client-side while the backend processes the assignments in parallel.

### 2. The Backend Workflow (n8n Serverless Webhook)
Instead of a traditional monolithic server (like Node.js/Express or Python/FastAPI), the entire backend logic is orchestrated through a single, powerful **n8n Webhook Workflow**. 

**How it works:**
1. **Single Entry Point:** The frontend sends all API requests (POST) to a centralized `Webhook Trigger` node in n8n.
2. **Action-Based Routing:** The payload contains an `action` key (e.g., `getVehicles`, `assignRoute`). A massive `Switch` node dynamically routes the request to the appropriate logic branch based on this action.
3. **Direct Database Integration:** 
   - Operations like `Get Drivers`, `Add Vehicle`, or `Delete Document` map directly to respective **MongoDB nodes** within n8n (`find_document`, `insert_document`, `delete_document`). 
   - This removes the need for an ORM or intermediate controller logic, drastically reducing backend latency and maintenance.
4. **External Services:** For mapping (e.g., `getRoutePath`), the switch node routes the request to an HTTP Request node that fetches coordinates from the **OpenRouteService (ORS)** API, completely abstracting third-party API keys away from the client.

### 3. AI Chatbot Assistant (LLM Integration)
The platform features a global AI Support Chatbot that parses natural language into system commands.
- When a user types *"Assign John Doe to the Ford Transit going to Bangalore"*, the frontend sends the prompt to a dedicated AI Webhook.
- The LLM parses the intent (`assignRoute`) and extracts the parameters (`driverId`, `vehicleId`, `endCoords`).
- The frontend then executes the standard API calls as if the user clicked through the UI, making the AI a true agentic assistant rather than just a conversational bot.

---

## 🚀 Key Features

*   **Real-time Dashboard:** Live statistics on travelling, idle, and maintenance vehicles.
*   **Interactive Dispatching:** Click-to-dispatch mapping with visual route lines and alternative route options.
*   **Intelligent Route Caching:** Lightning-fast routing UI that remembers previous trips.
*   **Driver & Vehicle Rosters:** Manage your entire fleet with instant UI updates.
*   **AI Fleet Assistant:** Perform complex dispatch operations using natural language.
*   **Integrated Support:** Global support bubble accessible on all pages (including Login) for instant help.

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation
1. Clone the repository and navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your `.env` file is properly configured with your n8n Webhook URLs:
   ```env
   VITE_N8N_BASE_URL=https://your-n8n-instance.com/webhook/fleet-management
   VITE_CHATBOT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/fleet-ai-agent
   VITE_MANAGER_USERNAME=manager_fleet1
   VITE_MANAGER_PASSWORD=securepassword
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

*Designed for high performance, ease of maintenance, and an exceptional user experience.*
