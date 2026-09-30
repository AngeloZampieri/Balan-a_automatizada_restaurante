# 🏷️ Totem de Pesagem e Autatendimento (Raspberry Pi + Escala)

Sistema web embarcado para automação de totem de pesagem e autoatendimento em restaurantes. O projeto integra hardware local (balança checkout Elgin via comunicação serial) a uma interface web em tempo real e scripts em Python rodando em modo Kiosk em um Raspberry Pi.

---

## 📋 Visão Geral

O sistema tem como objetivo automatizar o processo de leitura de peso e geração de comandas/impressão para pesagem em buffet e totens de refeição. A aplicação roda diretamente na inicialização do Raspberry Pi em modo tela cheia (*kiosk mode*), permitindo uma experiência fluida e sem intervenção manual do usuário no sistema operacional.

### 🛠️ Principais Recursos
- **Comunicação Serial Nativa:** Integração direta com a balança Elgin DP30CK utilizando a **Web Serial API** no navegador e scripts de apoio.
- **Interface Intuitiva:** Frontend web moderno, responsivo e adaptado para telas *touchscreen*.
- **Modo Kiosk Autônomo:** Configuração de autostart no sistema para inicialização direta no fluxo do sistema.
- **Módulo de Impressão e Suporte Local:** Scripts Python dedicados (`impressora.py`) para gestão de comandos locais e tarefas de fundo.

---

## 🏗️ Arquitetura e Tecnologias
[ Balança Elgin DP30CK ]
│ (Serial / USB)
▼
[ Raspberry Pi (OS) ] ── (Kiosk / Chromium) ──► [ Interface Web (index.html) ]
│
└──────► [ Script de Apoio (impressora.py) ]

* **Hardware:** Raspberry Pi, Balança Elgin DP30CK, Impressora Térmica.
* **Frontend:** HTML5, CSS3, JavaScript (Web Serial API).
* **Backend / Scripts Locais:** Python 3 (`impressora.py`).
* **Ambiente / OS:** Raspberry Pi OS (Labwc / Wayland / LXDE).

---

## 📂 Estrutura do Projeto


├── index.html            # Interface principal do totem
├── style.css             # Estilos e formatação visual
├── script_balanca.js     # Scripts de lógica de tela e leitura da Web Serial API
├── impressora.py         # Script Python para integração e comandos de impressão local
└── README.md             # Documentação do projeto

---

## 📋 Visão Geral & Regras de Negócio

O principal desafio resolvido pelo sistema é unificar em um único fluxo de autoatendimento e pesagem os diferentes modos de consumo de um restaurante:

1. **Self-Service por Peso (Quilo):**
   - Comunicação contínua via **Web Serial API** com a balança Elgin DP30CK.
   - Desconto automático do tara do prato.
   - Cálculo em tempo real do valor total com base no preço/kg cadastrado.

2. **Buffet Livre:**
   - Seleção direta na tela sem necessidade de cálculo por peso do alimento.
   - Registro instantâneo da opção na comanda para liberação de acesso ao buffet.

3. **Marmitas:**
   - Cálculo diferenciado da tara da embalagem plástica/isopor.
   - Emissão de etiqueta/comanda rápida de identificação.

---

## 🛠️ Principais Recursos

- **Fluxo Multimodal Dinâmico:** Interface gráfica que permite ao cliente escolher o tipo de refeição da pesagem.
- **Comunicação Serial Nativa (Web Serial API):** Leitura direta da balança Elgin DP30CK no navegador Chromium sem intermediários pesados.
- **Integração com Impressora Local (`impressora.py`):** Script em Python em segundo plano para envio de comandos ESC/POS e impressão de comandas/vouchers.
- **Modo Kiosk Resiliente:** Inicialização automática no Raspberry Pi em tela cheia com proteção contra queda de sessão e sem menus do sistema operacional.

---

## 🏗️ Arquitetura do Sistema


               ┌────────────────────────┐
               │  Balança Elgin DP30CK  │
               └───────────┬────────────┘
                           │ (USB / Serial RS232)
                           ▼
 ┌──────────────────────────────────────────────────┐
 │               Raspberry Pi (OS)                  │
 │                                                  │
 │   Chromium (Kiosk) ──► Interface Web (index.html) │
 │                             │                    │
 │                             ▼                    │
 │                     Web Serial API               │
 │                             │                    │
 │                             ▼                    │
 │                     Lógica de Negócio            │
 │            (Peso / Livre / Marmita P-M-G)        │
 │                             │                    │
 │                             ▼                    │
 │                     python3 impressora.py        │
 └─────────────────────────────┬────────────────────┘
                               │ (USB / Serial)
                               ▼
                   ┌────────────────────────┐
                   │   Impressora Térmica   │
                   └────────────────────────┘

🔒 Licença e Direitos de Uso
Todos os direitos reservados (All Rights Reserved).

Este repositório é público exclusivamente para fins de exibição de portfólio, estudo e demonstração de arquitetura. Não é concedida nenhuma permissão para cópia, alteração, redistribuição, comercialização ou uso do código fonte em ambientes de produção por terceiros sem autorização prévia e por escrito do autor.

Desenvolvido por Angelo Zampieri
