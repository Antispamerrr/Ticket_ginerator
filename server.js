const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session'); // <--- добавляем
const app = express();
const PORT = 3000;

// Папка public для HTML/CSS/JS
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '10mb' })); // поддержка больших QR-кодов

// --- СЕССИИ ---
app.use(session({
    secret: 'super-secret-key', // поменяй на свой
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true только с HTTPS
}));

// "База" пользователей (можно хранить в файле или БД)
const USERS = [
    { username: "admin", password: "1234" } // пароль пока в открытом виде
];

// Middleware для защиты страниц
function requireAuth(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login.html');
}

// Логин
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = user;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'Неверные данные' });
});

// Логаут
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});


const TICKETS_FILE = path.join(__dirname, 'tickets.json');

// Функция чтения билетов
function readTickets() {
    if (!fs.existsSync(TICKETS_FILE)) return [];
    const data = fs.readFileSync(TICKETS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
}

// Функция записи билетов
function writeTickets(tickets) {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

// Доступ к API только для авторизованных
app.get('/api/tickets', requireAuth, (req, res) => {
    res.json(readTickets());
});

app.get('/api/tickets/:key', requireAuth, (req, res) => {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.key === req.params.key);
    if (ticket) res.json(ticket);
    else res.status(404).json({ error: 'Ticket not found' });
});

app.post('/api/tickets', requireAuth, (req, res) => {
    const ticketData = req.body;
    if (!ticketData.key) {
        ticketData.key = 'ticket_' + Date.now();
    }
    let tickets = readTickets();
    const idx = tickets.findIndex(t => t.key === ticketData.key);
    if (idx > -1) tickets[idx] = ticketData;
    else tickets.push(ticketData);
    writeTickets(tickets);
    res.json({ success: true, key: ticketData.key });
});

app.delete('/api/tickets/:key', requireAuth, (req, res) => {
    let tickets = readTickets();
    tickets = tickets.filter(t => t.key !== req.params.key);
    writeTickets(tickets);
    res.json({ success: true });
});

app.put('/api/tickets/:key', requireAuth, (req, res) => {
    const { key } = req.params;
    let tickets = readTickets();
    const idx = tickets.findIndex(t => t.key === key);
    if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
    tickets[idx] = { ...tickets[idx], ...req.body, key };
    writeTickets(tickets);
    res.json({ success: true, ticket: tickets[idx] });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});