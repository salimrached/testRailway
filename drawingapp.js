// Get DOM elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const sizeDisplay = document.getElementById('sizeDisplay');
const status = document.getElementById('status');
const usersCount = document.getElementById('usersCount');
const username = document.getElementById('username');
const notifications = document.getElementById('notifications');
const drawingTool = document.getElementById('drawingTool');

// Drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentUser = null;
let currentTool = 'brush';

// Initialize Socket.IO
const socket = io();

// Socket.IO event handlers
socket.on('connect', () => {
    status.textContent = 'Connected - Ready to draw!';
    status.className = 'connected';
});

socket.on('disconnect', () => {
    status.textContent = 'Disconnected - Reconnecting...';
    status.className = 'disconnected';
});

socket.on('reconnect', () => {
    status.textContent = 'Reconnected - Ready to draw!';
    status.className = 'connected';
});

// Listen for user count updates
socket.on('userCount', (count) => {
    usersCount.textContent = `Users online: ${count}`;
});

// Listen for user profile
socket.on('userProfile', (profile) => {
    currentUser = profile;
    username.textContent = profile.username;
    username.style.color = profile.color;
    showNotification(`Welcome! You are ${profile.username}`, 'success');
});

// Listen for user joined/left events
socket.on('userJoined', (user) => {
    showNotification(`${user.username} joined the canvas!`, 'info');
});

socket.on('userLeft', (user) => {
    showNotification(`${user.username} left the canvas`, 'info');
});

// Listen for drawing events from other users
socket.on('draw', (data) => {
    if (data.tool === 'eraser') {
        eraseAt(data.x2, data.y2, data.size);
    } else {
        drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.size);
    }
});

// Listen for clear canvas events
socket.on('clear', (data) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (data && data.clearedBy) {
        showNotification(`Canvas cleared by ${data.clearedBy}`, 'info');
    }
});

// Drawing functions
function drawLine(x1, y1, x2, y2, color, size) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function eraseAt(x, y, size) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notifications.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
}

// Clear canvas function
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    const color = colorPicker.value;
    const size = brushSize.value;
    const tool = drawingTool.value;
    
    // Draw locally
    if (tool === 'eraser') {
        eraseAt(pos.x, pos.y, size);
    } else {
        drawLine(lastX, lastY, pos.x, pos.y, color, size);
    }
    
    // Send to other users
    socket.emit('draw', {
        x1: lastX,
        y1: lastY,
        x2: pos.x,
        y2: pos.y,
        color: color,
        size: size,
        tool: tool
    });
    
    lastX = pos.x;
    lastY = pos.y;
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

// Touch events for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const pos = getTouchPos(e);
    lastX = pos.x;
    lastY = pos.y;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const pos = getTouchPos(e);
    const color = colorPicker.value;
    const size = brushSize.value;
    const tool = drawingTool.value;
    
    // Draw locally
    if (tool === 'eraser') {
        eraseAt(pos.x, pos.y, size);
    } else {
        drawLine(lastX, lastY, pos.x, pos.y, color, size);
    }
    
    // Send to other users
    socket.emit('draw', {
        x1: lastX,
        y1: lastY,
        x2: pos.x,
        y2: pos.y,
        color: color,
        size: size,
        tool: tool
    });
    
    lastX = pos.x;
    lastY = pos.y;
});

canvas.addEventListener('touchend', () => {
    isDrawing = false;
});

// Brush size display
brushSize.addEventListener('input', (e) => {
    sizeDisplay.textContent = e.target.value + 'px';
});

// Tool selection
drawingTool.addEventListener('change', (e) => {
    currentTool = e.target.value;
    if (currentTool === 'eraser') {
        canvas.style.cursor = 'grab';
        colorPicker.disabled = true;
    } else {
        canvas.style.cursor = 'crosshair';
        colorPicker.disabled = false;
    }
});

// Prevent scrolling when touching the canvas
document.body.addEventListener('touchstart', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchend', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });
