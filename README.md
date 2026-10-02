# Gerenciador de Tarefas 2.0

Quadro Kanban com login, feito em **Angular 22 + TypeScript**, **Supabase**, **PrimeNG**, **Tailwind CSS** e **Angular CDK** (arrastar e soltar).

## Arquitetura: MVC clássico

```
src/app/
├── models/        M — dados, regras de negócio e acesso ao Supabase
│   ├── entities/  regras puras (validação, mover tarefa, limites)
│   ├── task.model.ts
│   └── auth.model.ts
├── controllers/   C — recebem as ações da tela, chamam o Model e guardam o estado
│   ├── task.controller.ts
│   └── auth.controller.ts
├── views/         V — telas e componentes; só mostram e repassam cliques
│   ├── login/
│   ├── board/
│   └── components/ (kanban-column, task-card, task-dialog)
└── core/          infraestrutura (conexão Supabase, guards, avisos, tema)
```

Regras:

- A **View** nunca chama o Model nem o banco, só o Controller.
- O **Controller** não mexe em HTML.
- O **Model** não conhece View nem Controller.

Fluxo: `View → Controller → Model → Supabase`. O Controller atualiza o estado e a View redesenha sozinha.

## Como rodar

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No Supabase, abra **SQL Editor** e rode o arquivo [supabase/schema.sql](supabase/schema.sql).
3. Em **Project Settings → API**, copie a URL e a anon key para [src/environments/environment.ts](src/environments/environment.ts).
4. Instale e rode:

```bash
npm install
npm start          # abre em http://localhost:4200
```

> Para testar sem confirmar e-mail: Supabase → Authentication → Sign In / Providers → Email → desative **Confirm email**.

## Testes unitários (Vitest)

```bash
npm test -- --watch=false
```

Cada camada é testada separadamente: Model (com o Supabase simulado), Controller (com o Model simulado) e View (com o Controller simulado).

## Atalhos

- `C` cria uma nova tarefa.
- Clique duplo no cartão abre a edição.
