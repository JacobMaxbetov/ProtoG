// === В САМОМ НАЧАЛЕ ФАЙЛА ===
require('dotenv').config();

console.log('=== ENV LOADED ===');
console.log('YOOKASSA_SHOP_ID:', process.env.YOOKASSA_SHOP_ID || 'НЕТ');
console.log('YOOKASSA_SECRET_KEY:', process.env.YOOKASSA_SECRET_KEY ? 'Загружен (тестовый)' : 'НЕТ');
console.log('PORT:', process.env.PORT);
console.log('==================');

const YooKassa = require('yookassa');
const db = require('../db');
const yooKassa = new YooKassa({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});


// Создание платежа
const createDeposit = async (req, res) => {
  const userId = req.user.id;
  let { amount } = req.body;

  amount = parseFloat(amount);

  if (!amount || amount < 10) {
    return res.status(400).json({ message: 'Минимальная сумма пополнения — 10 ₽' });
  }
  
  try {
    const idempotenceKey = `deposit_${userId}_${Date.now()}`;

    const payment = await yooKassa.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: "RUB"
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${process.env.VITE_FRONTEND_URL}/dashboard?payment=success`
      },
      description: `Пополнение баланса пользователя ${userId}`,
      metadata: {
        userId: userId.toString(),
        type: "deposit"
      }
    }, idempotenceKey);

    console.log(`✅ Создан платеж #${payment.id} на ${amount} ₽`);

    db.run(`
      INSERT INTO payments (user_id, yookassa_id, amount, status)
      VALUES (?, ?, ?, 'pending')
    `, [userId, payment.id, Math.round(amount * 100)]);

    res.json({
      confirmationUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('❌ YooKassa createPayment error:', error.message || error);
    res.status(500).json({ message: 'Ошибка создания платежа' });
  }
};

// Проверка статуса платежа
const checkPaymentStatus = async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;

  try {
    const payment = await yooKassa.getPayment(paymentId);
    
    console.log(`🔍 Проверка платежа ${paymentId}: статус = ${payment.status}`);

    if (payment.status === 'succeeded') {
      const amountKopecks = parseInt(payment.amount.value * 100);

      db.run(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [amountKopecks, userId],
        (err) => {
          if (err) {
            console.error('Ошибка обновления баланса:', err);
          } else {
            console.log(`🎉 БАЛАНС ПОПОЛНЕН! Пользователь ${userId} + ${amountKopecks / 100} ₽`);
          }
        }
      );

      db.run('UPDATE payments SET status = "succeeded" WHERE yookassa_id = ?', [paymentId]);
    }

    res.json({ status: payment.status });
  } catch (error) {
    console.error('Ошибка getPayment:', error.message);
    res.status(500).json({ message: 'Не удалось проверить статус платежа' });
  }
};

const handleWebhook = (req, res) => {
  console.log('📨 Webhook received');
  res.sendStatus(200);
};

module.exports = { 
  createDeposit, 
  checkPaymentStatus, 
  handleWebhook 
};