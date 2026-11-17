const nodemailer = require('nodemailer');

// Transporter criado fora da função para reuso de conexão (pooling)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'jifoieorif4r@gmail.com',
        pass: process.env.EMAIL_PASS || 'hqqb bpwk vdaq kklm'
    }
});

module.exports = {
    sendEmail: async (email, token) => {
        try {
            const mailOptions = {
                from: `"RST Cloud Gaming" <${process.env.EMAIL_USER || 'jifoieorif4r@gmail.com'}>`,
                to: email,
                subject: 'Email Valido',
                html: `

    <div style="
        background:#0f172a;
        padding:40px;
        font-family:Arial;
        color:white;
        text-align:center;
    ">

        <h1 style="
            color:#22c55e;
            font-size:32px;
            margin-bottom:20px;
        ">
            Verifique sua Conta
        </h1>

        <p style="
            color:#cbd5e1;
            font-size:16px;
            margin-bottom:35px;
        ">
            Clique no botão abaixo para confirmar seu email.
        </p>

        <a 
            href="http://192.168.30.103:3000/api/auth/verify/${email}/${token}"
            style="
                display:inline-block;
                background:#22c55e;
                color:white;
                text-decoration:none;
                padding:16px 38px;
                border-radius:12px;
                font-size:18px;
                font-weight:bold;
            "
        >
            Confirmar Email
        </a>

        <p style="
            margin-top:40px;
            color:#64748b;
            font-size:13px;
        ">
            Se você não criou uma conta, ignore este email.
        </p>

        <hr style="
            border:none;
            border-top:1px solid #334155;
            margin:30px 0;
        ">

        <p style="
            font-size:12px;
            color:#64748b;
        ">
            © 2026 RST Cloud Gaming
        </p>

    </div>

    `
            };

            await transporter.sendMail(mailOptions);
         
        } catch (error) {
            console.error('Erro ao enviar email:', error);
        }
    }
};