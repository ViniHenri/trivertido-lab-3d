# Trivertido Lab

Hub web de geração e customização de modelos 3D da **Trivertido 3D**. O cliente customiza um modelo (foto, texto, medidas), vê o preview 3D no navegador e exporta o STL ou envia o pedido de impressão direto pra fila da Trivertido.

## O que o projeto faz

- **Ferramentas paramétricas** (100% client-side, sem custo de API): Vase Maker, Lithophane, Sign/Plate, Keychain, Laser Box, Desk Organizer
- **Image to 3D** (IA via 3D AI Studio API): foto vira modelo 3D completo
- **Pedidos de impressão**: registro no Supabase (`lab_generations`) + webhook n8n → Kanban + notificação WhatsApp (Evolution API)

## Stack

- Next.js 16 (App Router) + TypeScript + TailwindCSS
- Three.js via `@react-three/fiber` + `@react-three/drei`
- Supabase (Postgres + Storage) — projeto existente da Trivertido
- Deploy: Vercel (via Git)

## Estrutura

```
apps/web/
  app/(tools)/          # páginas das ferramentas
  app/api/              # route handlers (proxy IA, export, webhook n8n)
  components/viewer/    # Model3DViewer e ExportPanel reutilizáveis
  lib/geometry/         # geradores de geometria puros (testáveis, sem UI)
  lib/providers/        # abstração do provedor de IA (ImageTo3DProvider)
  lib/supabase/         # clients e tipos
  lib/n8n/              # webhook de pedidos
```

## Como rodar

```bash
cd apps/web
npm install
cp ../../.env.example .env.local   # preencher as variáveis
npm run dev
```

Abre em http://localhost:3000.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (server only) |
| `THREEDAI_STUDIO_API_KEY` | API de Image-to-3D (server only) |
| `N8N_WEBHOOK_URL` | Webhook de pedidos no n8n |

Em produção, configurar em **Vercel → Settings → Environment Variables**. Nunca commitar chaves.

## Setup do Supabase (uma vez)

1. Criar a tabela `lab_generations`:

```sql
create table lab_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool text not null,
  status text not null default 'pending',
  params jsonb not null default '{}',
  file_path text,
  file_format text,
  provider_job_id text,
  customer_name text,
  customer_phone text,
  filament_color text,
  notes text
);
```

2. Criar o bucket privado `lab-models` no Storage.

## Roadmap

- [x] **Fase 1** — Fundação: repo, viewer 3D genérico, Supabase, deploy
- [x] **Fase 2** — Paramétricas: Lithophane, Vase, Sign
- [x] **Fase 3** — Image to 3D (IA): integração 3D AI Studio + polling + Storage (requer `THREEDAI_STUDIO_API_KEY`)
- [x] **Fase 4** — Laser Box, Keychain (vetorização), Desk Organizer
- [x] **Fase 5** — Pedidos: cor de filamento via estoque (`stock`); webhook n8n pronto no código (requer `N8N_WEBHOOK_URL` + workflow no n8n)

## Payload do webhook n8n (pedido de impressão)

O `/api/webhook/n8n` envia POST com:

```json
{
  "source": "trivertido-lab",
  "generation": {
    "id": "uuid",
    "tool": "vase | lithophane | sign | keychain | laser-box | desk-organizer | image-to-3d",
    "file_path": "vase/xxx.stl",
    "file_format": "stl",
    "customer_name": "Nome",
    "customer_phone": "11999999999",
    "filament_color": "PLA Amarelo Lite (PLA)",
    "notes": null
  },
  "modelUrl": "https://...url assinada válida por 7 dias..."
}
```

O workflow no n8n deve: criar tarefa no Kanban (tabela `tasks`) e notificar o dono via WhatsApp (Evolution API, instância Trivertido).

## Deploy (Vercel)

1. Subir o repo pro GitHub
2. Importar na Vercel e definir **Root Directory = `apps/web`** (Settings → Build and Deployment)
3. Configurar as variáveis de ambiente
4. Push na `main` = deploy automático
