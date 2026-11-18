Vapex Cloud Game

«Plataforma experimental de Cloud Gaming baseada em acesso remoto a recursos computacionais, pagamentos digitais e armazenamento em nuvem.»

Sobre o projeto

O Vapex Cloud Game é um MVP (Minimum Viable Product) desenvolvido para explorar e validar a viabilidade técnica e comercial de um modelo de negócio baseado na disponibilização de computadores para jogos por acesso remoto.

A proposta consiste em permitir que usuários utilizem recursos computacionais para executar jogos sem a necessidade de adquirir ou manter um computador gamer próprio.

O projeto reúne desenvolvimento de software, infraestrutura computacional, gerenciamento de usuários, integração de serviços externos e validação de um modelo de negócio baseado em utilização sob demanda.

Índice

- "Visão geral" (#visão-geral)
- "Funcionalidades" (#funcionalidades)
- "Arquitetura de software" (#arquitetura-de-software)
- "Tecnologias utilizadas" (#tecnologias-utilizadas)
- "Integrações externas" (#integrações-externas)
- "Infraestrutura computacional" (#infraestrutura-computacional)
- "Modelo de negócio" (#modelo-de-negócio)
- "Status do projeto" (#status-do-projeto)
- "Perspectivas de evolução" (#perspectivas-de-evolução)
- "Autor" (#autor)

---

Visão geral

O Vapex Cloud Game foi concebido como um produto experimental para investigar a viabilidade de disponibilizar computadores para jogos por meio de um serviço de acesso remoto.

A implementação inicial concentra-se na construção da infraestrutura de software e na integração dos serviços necessários para sustentar as principais operações da aplicação.

O projeto contempla autenticação, gerenciamento financeiro, comunicação em tempo real, gerenciamento de sessões, filas e armazenamento de arquivos na nuvem.

Funcionalidades

Autenticação e segurança

Implementação de um sistema próprio de autenticação para gerenciamento de usuários e controle de acesso à aplicação.

- Cadastro e autenticação de usuários.
- Validação de endereço de e-mail.
- Autenticação baseada em JWT (JSON Web Token).
- Proteção de endpoints da API.
- Validação de tokens para acesso a recursos restritos.

Carteira digital (Wallet)

Módulo financeiro integrado à aplicação para gerenciamento do saldo dos usuários.

Processamento de pagamentos

Integração com o Mercado Pago como gateway de pagamento, utilizando PIX como modalidade para adicionar créditos à carteira digital.

Armazenamento na nuvem (Cloud Save)

Integração com a Google Drive API para implementação da funcionalidade Cloud Save, permitindo o armazenamento e gerenciamento remoto de arquivos de jogos.

Comunicação em tempo real

Utilização do Socket.IO para estabelecer comunicação bidirecional e persistente entre o aplicativo e o backend.

A implementação permite a troca de eventos e informações em tempo real entre clientes conectados e o servidor.

Gerenciamento de sessões e filas

Utilização do Redis para operações de armazenamento em memória, gerenciamento de sessões e organização de filas de processamento.

---

Arquitetura de software

A aplicação utiliza o padrão arquitetural MVC (Model-View-Controller), que promove a separação de responsabilidades entre os principais componentes do sistema.

Componente| Responsabilidade
Model| Representação dos dados e regras de negócio.
View| Interface e apresentação das informações.
Controller| Processamento das requisições e coordenação entre os componentes.

Visão geral da arquitetura

flowchart TD
    A[Aplicativo] --> B[Backend]
    B --> C[Controller]
    C --> D[Model]
    C --> E[View]
    D --> F[(PostgreSQL)]
    B --> G[(Redis)]
    B <--> H[Socket.IO]
    B --> I[Mercado Pago API]
    B --> J[Google Drive API]

O backend integra serviços externos e componentes de infraestrutura para suportar as principais funcionalidades da aplicação.

---

Tecnologias utilizadas

Categoria| Tecnologia
Arquitetura de software| MVC
Banco de dados relacional| PostgreSQL
Armazenamento em memória| Redis
Gerenciamento de sessões| Redis
Gerenciamento de filas| Redis
Autenticação| JWT
Comunicação em tempo real| Socket.IO
Gateway de pagamento| Mercado Pago
Modalidade de pagamento| PIX
Armazenamento em nuvem| Google Drive API

Integrações externas

Mercado Pago

Integração com o gateway de pagamento Mercado Pago para processamento de pagamentos via PIX e conexão do fluxo financeiro com a carteira digital da aplicação.

Google Drive API

Integração com o serviço de armazenamento em nuvem do Google para implementação do Cloud Save, permitindo o gerenciamento remoto de arquivos salvos dos jogos.

Socket.IO

Implementação de comunicação bidirecional entre o aplicativo e o backend, utilizando conexões persistentes e troca de eventos em tempo real.

---

Infraestrutura computacional

Configuração inicial de hardware utilizada durante a experimentação e validação técnica do MVP:

Componente| Especificação
Processador| Intel Xeon E5-2640 v3
Placa de vídeo| AMD Radeon RX 580 8 GB
Memória RAM| 16 GB

Essa configuração representa o ambiente computacional inicial utilizado para experimentação do serviço.

Modelo de negócio

O modelo inicialmente proposto explora a disponibilização de computadores para jogos por acesso remoto, mediante pagamento proporcional ao tempo de utilização.

O objetivo é validar a demanda dos usuários, a viabilidade operacional e o potencial comercial de uma infraestrutura de jogos remotos.

Status do projeto

MVP — Desenvolvimento e validação de mercado.

O Vapex Cloud Game é um produto experimental. Sua fase atual concentra-se na implementação técnica, experimentação da infraestrutura e validação da proposta de valor.

O projeto busca estabelecer uma base para avaliar melhorias futuras e oportunidades de evolução do produto.

Perspectivas de evolução

- Aprimoramento da infraestrutura computacional.
- Expansão da capacidade de processamento remoto.
- Melhorias na experiência dos usuários.
- Automação de processos operacionais.
- Ampliação das integrações com serviços externos.

---

Autor

Fernando Feitosa

Desenvolvimento de Software | Infraestrutura de TI | Projetos de Tecnologia

---

Vapex Cloud Game