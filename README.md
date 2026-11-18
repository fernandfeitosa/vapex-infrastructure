Vapex Cloud Game

Plataforma experimental de Cloud Gaming.

O Vapex Cloud Game é um MVP desenvolvido para explorar a viabilidade técnica e comercial de uma solução de acesso remoto a computadores para jogos, integrando infraestrutura computacional, serviços financeiros e armazenamento em nuvem.

Funcionalidades

- Autenticação: sistema próprio de usuários, validação de e-mail e autenticação JWT.
- Wallet: gerenciamento de saldo dos usuários.
- Pagamentos: integração com Mercado Pago para transações via PIX.
- Cloud Save: armazenamento de arquivos de jogos por meio da Google Drive API.
- Comunicação em tempo real: integração entre aplicativo e backend utilizando Socket.IO.
- Gerenciamento de sessões e filas: utilização de Redis.

Arquitetura

MVC — Model-View-Controller

Organização da aplicação com separação de responsabilidades entre modelos, controladores e camada de apresentação.

Stack tecnológica

Tecnologia| Finalidade
PostgreSQL| Persistência relacional
Redis| Sessões e filas
JWT| Autenticação e proteção de endpoints
Socket.IO| Comunicação em tempo real
Mercado Pago| Integração financeira
Google Drive API| Armazenamento em nuvem
MVC| Arquitetura de software

Infraestrutura computacional

Componente| Especificação
CPU| Intel Xeon E5-2640 v3
GPU| AMD Radeon RX 580 8 GB
RAM| 16 GB

Escopo do projeto

O desenvolvimento contempla integração de serviços, gerenciamento de usuários, operações financeiras, comunicação em tempo real e experimentação de infraestrutura computacional.

Status: MVP — Desenvolvimento e validação de mercado.

---

Fernando Feitosa
Desenvolvimento de Software · Infraestrutura de TI