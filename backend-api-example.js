// Backend API Example for Instamojo Payment Integration
// This should be on your backend server (Node.js/Express example)

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Instamojo API Credentials (keep these in environment variables)
const INSTAMOJO_API_KEY = "a9fcfbb6ea4a10e0b45fffdb0123eb27";
const INSTAMOJO_AUTH_TOKEN = "0362bd42850674f1f801b2cdb750c372";
const INSTAMOJO_SALT = "214d1ba5a7644aed8d4454851f056d7b";

// Endpoint to create Instamojo payment request
app.post('/api/create-instamojo-payment', async (req, res) => {
    try {
        const { amount, currency = 'INR', purpose, buyer_name, email, phone, redirect_url, webhook } = req.body;

        // Create form data for Instamojo API
        const formData = new FormData();
        formData.append('purpose', purpose || 'Reward payment - Cashback');
        formData.append('amount', amount);
        formData.append('currency', currency);
        formData.append('redirect_url', redirect_url || 'https://yourdomain.com/payment-success');
        formData.append('webhook', webhook || 'https://yourdomain.com/api/payment-webhook');
        
        if (buyer_name) formData.append('buyer_name', buyer_name);
        if (email) formData.append('email', email);
        if (phone) formData.append('phone', phone);

        // Call Instamojo API
        const response = await axios.post(
            'https://www.instamojo.com/api/1.1/payment-requests/',
            formData,
            {
                headers: {
                    'X-Api-Key': INSTAMOJO_API_KEY,
                    'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
                    ...formData.getHeaders()
                }
            }
        );

        if (response.data.success && response.data.payment_request) {
            res.json({
                success: true,
                payment_url: response.data.payment_request.longurl,
                payment_request_id: response.data.payment_request.id
            });
        } else {
            res.status(400).json({ success: false, error: 'Failed to create payment request' });
        }
    } catch (error) {
        console.error('Instamojo API error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Payment gateway error' });
    }
});

// Webhook endpoint to verify payment (use Salt for verification)
app.post('/api/payment-webhook', (req, res) => {
    try {
        const { payment_id, payment_request_id, payment_status } = req.body;
        
        // Verify webhook using Salt (check Instamojo docs for verification process)
        // This is a simplified example - implement proper verification
        
        if (payment_status === 'Credit') {
            // Payment successful - update your database
            console.log('Payment successful:', payment_id);
            // TODO: Update payment status in your database
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// For production, use environment variables:
// const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
// const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;
// const INSTAMOJO_SALT = process.env.INSTAMOJO_SALT;

