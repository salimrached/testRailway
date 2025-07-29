# 🎨 Multiplayer Drawing Board

A real-time collaborative drawing application built with Node.js, Express, and Socket.IO. Draw together with friends in real-time!

## ✨ Features

- **Real-time Collaboration**: Draw simultaneously with multiple users
- **Room System**: Create private rooms or join existing ones with room codes
- **Color Palette**: 8 predefined colors to choose from
- **Adjustable Brush Size**: Customize your brush from 1px to 20px
- **Live Chat**: Communicate with other users while drawing
- **Canvas Clearing**: Clear the entire canvas for everyone
- **Mobile Support**: Touch-friendly interface for tablets and phones
- **User Management**: See who's online with color-coded user indicators

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18.x or higher)
- npm (Node Package Manager)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:

   ```bash
   cd RailwayServer_DrawingApp
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open your web browser and go to:
   ```
   http://localhost:3000
   ```

## 🎮 How to Use

### Creating a Room

1. Enter your name in the "Your Name" field
2. Click "Create New Room"
3. Share the generated room code with friends

### Joining a Room

1. Enter your name in the "Your Name" field
2. Enter the room code in "Or Join Room" field
3. Click "Join Room"

### Drawing

- **Select Colors**: Click on any color in the palette
- **Adjust Brush Size**: Use the slider to change brush thickness
- **Draw**: Click and drag on the canvas to draw
- **Clear Canvas**: Click "Clear Canvas" to erase everything (affects all users)

### Chat

- Type messages in the chat box at the bottom right
- Press Enter or click "Send" to send messages
- See messages from all users in the room

## 🏗️ Architecture

### Backend (server.js)

- **Express.js**: Web server framework
- **Socket.IO**: Real-time bidirectional communication
- **Room Management**: Handles user connections and room creation
- **Drawing Synchronization**: Broadcasts drawing events to all users
- **Chat System**: Real-time messaging between users

### Frontend (index.html)

- **HTML5 Canvas**: For drawing functionality
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Instant synchronization of drawings and chat

## 🌐 Deployment

### Railway Deployment

This application is configured for Railway deployment with:

- `package.json` engines field specifying Node.js version
- Environment variable support for PORT
- Automatic dependency installation

### Environment Variables

- `PORT`: Server port (defaults to 3000)

## 🔧 Technical Details

### Socket Events

- `createRoom`: Create a new drawing room
- `joinRoom`: Join an existing room
- `startDrawing`: Begin a drawing stroke
- `drawing`: Continue drawing stroke
- `stopDrawing`: End drawing stroke
- `clearCanvas`: Clear the entire canvas
- `chatMessage`: Send chat messages

### Data Structures

- **Rooms**: Store user lists and drawing data
- **Drawing Data**: Coordinate points, colors, and brush sizes
- **User Data**: Names, colors, and socket IDs

## 🎨 Customization

### Adding More Colors

Edit the `colors` array in `server.js` and add corresponding color buttons in `index.html`:

```javascript
const colors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FECA57",
  "#FF9FF3",
  "#54A0FF",
  "#5F27CD",
  "#YOUR_COLOR",
];
```

### Adjusting Room Limits

Change the user limit per room in `server.js`:

```javascript
if (room.users.length >= 10) {
  // Change this number
  socket.emit("error", "Room is full");
  return;
}
```

## 🛠️ Development

### Local Development

```bash
npm run dev
```

### Adding Features

- **Shapes**: Add rectangle, circle, and line tools
- **Layers**: Implement drawing layers
- **Save/Export**: Add functionality to save drawings as images
- **Undo/Redo**: Implement drawing history

## 🐛 Troubleshooting

### Common Issues

1. **Canvas not loading**: Check if Socket.IO connection is established
2. **Drawing not syncing**: Verify room joining was successful
3. **Mobile touch issues**: Ensure touch events are properly handled

### Debug Mode

Add console logging to track events:

```javascript
socket.on("drawing", (data) => {
  console.log("Drawing event:", data);
  drawOnCanvas(data);
});
```

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎉 Enjoy Drawing!

Have fun creating art together with friends in real-time! 🎨✨
