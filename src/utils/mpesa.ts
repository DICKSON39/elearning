import axios, { AxiosError } from 'axios';

const formatPhoneNumber = (phone: string) => {
    // Converts 0712345678 to 254712345678
    return phone.replace(/^0/, '254');
};
export const generateToken = async () => {
    const consumerKey = process.env.CONSUMER_KEY!;
    const consumerSecret = process.env.CONSUMER_SECRET!;

   // console.log(consumerKey)
    //console.log(consumerSecret)

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );

        //console.log('🟢 Token generated:', response.data); // Debug log
        return response.data.access_token;
    } catch (err: unknown) {
        const error = err as AxiosError;
        console.error('🔴 M-Pesa Token Error:', error.response?.data || error.message);
        throw new Error('Failed to generate M-Pesa token');
    }
};
export const initiateSTKPush = async (accessToken: string, phone: string, amount: number) => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
        `${process.env.SHORT_CODE}${process.env.PASS_KEY}${timestamp}`
    ).toString('base64');

    const formattedPhone = formatPhoneNumber(phone);

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: process.env.SHORT_CODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: formattedPhone,
                PartyB: process.env.SHORT_CODE,
                PhoneNumber: formattedPhone,
                CallBackURL: `${process.env.BASE_URL}/api/payments/mpesa/callback`,
                AccountReference: 'Course123',
                TransactionDesc: 'Course Payment',
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        //console.log('🟢 STK Push Success:', response.data); // Debug log
        return response.data;
    } catch (err: unknown) {
        const error = err as AxiosError;
        console.error('🔴 STK Push Error:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK push');
    }
};
