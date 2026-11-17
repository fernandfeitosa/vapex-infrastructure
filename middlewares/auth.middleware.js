import jwt from "jsonwebtoken";

export default function authMiddleware(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;

        // Verifica se enviou Authorization
        if (!authHeader) {

            return res.status(401).json({
                success: false,
                error: "Token não enviado"
            });
        }

        // Remove Bearer
        const token =
            authHeader.replace("Bearer ", "");

        // Token vazio
        if (!token) {

            return res.status(401).json({
                success: false,
                error: "Token inválido"
            });
        }

        // Verifica JWT
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        // Salva usuário na request
        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error: error
        });
    }
}