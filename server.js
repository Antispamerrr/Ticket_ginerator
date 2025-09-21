const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

// Папка public для HTML/CSS/JS
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '10mb' })); // поддержка больших QR-кодов

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

// Получить все билеты
app.get('/api/tickets', (req, res) => {
    const tickets = readTickets();
    res.json(tickets);
});

// Получить один билет по ключу
app.get('/api/tickets/:key', (req, res) => {
    const tickets = readTickets();
    const ticket = tickets.find(t => t.key === req.params.key);
    if (ticket) res.json(ticket);
    else res.status(404).json({ error: 'Ticket not found' });
});

// Создать или обновить билет
app.post('/api/tickets', (req, res) => {
    const ticketData = req.body;
    if (!ticketData.key) {
        // новый билет
        ticketData.key = 'ticket_' + Date.now();
    }

    let tickets = readTickets();
    const idx = tickets.findIndex(t => t.key === ticketData.key);
    if (idx > -1) tickets[idx] = ticketData; // обновление
    else tickets.push(ticketData); // добавление нового

    writeTickets(tickets);
    res.json({ success: true, key: ticketData.key });
});

// Удаление билета
app.delete('/api/tickets/:key', (req, res) => {
    let tickets = readTickets();
    tickets = tickets.filter(t => t.key !== req.params.key);
    writeTickets(tickets);
    res.json({ success: true });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});