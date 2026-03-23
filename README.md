# CRM Imobiliário para Consultores

Sistema CRM completo para consultores imobiliários com suporte a sub-agentes.

## Iniciar Rapidamente

**Duplo clique em `INICIAR.bat`** — abre o backend e frontend automaticamente.

Depois aceder a: **http://localhost:5173**

## Credenciais de Acesso

| Email | Password | Perfil |
|-------|----------|--------|
| admin@crm.pt | Admin123! | Administrador |
| joao@crm.pt | Pass123! | Consultor Principal |
| ana@crm.pt | Pass123! | Sub-Agente (reporta a João) |
| pedro@crm.pt | Pass123! | Sub-Agente (reporta a João) |

## Funcionalidades

- **Dashboard** — métricas, gráfico de pipeline, atividade recente
- **Contactos** — gestão de leads e clientes com filtros avançados
- **Pipeline Kanban** — arrastar e soltar oportunidades entre fases
- **Propriedades** — gestão do portfólio imobiliário
- **Tarefas** — lista e calendário mensal
- **Relatórios** — funil de pipeline, performance por agente
- **Utilizadores** — gestão de consultores e sub-agentes (só Admin)
- **Comunicação** — registo de emails, WhatsApp, chamadas, reuniões e notas

## Arranque Manual

```bash
# Terminal 1 — Backend
cd backend
npm run dev        # http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm run dev        # http://localhost:5173
```

## Stack Técnica

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Base de Dados**: SQLite (via Prisma ORM)
- **Auth**: JWT

## Reconfigurar Base de Dados

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```
