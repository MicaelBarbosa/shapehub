# ShapeHub

Site acadêmico de treinos personalizados, com frontend responsivo, simulador de sugestão de treino e backend em Node.js com PostgreSQL.

## Estrutura

- `index.html`: estrutura principal da página.
- `login.html`: tela de login e cadastro.
- `perfil.html`: perfil do usuário.
- `meu-treino.html`: treino salvo.
- `css/style.css`: estilos, responsividade e identidade visual.
- `js/script.js`: interações, botões e gerador de treino.
- `server.js`: backend Node.js e servidor dos arquivos do site.
- `database.js`: conexão segura e consultas parametrizadas ao PostgreSQL.
- `migrations/`: estrutura SQL criada automaticamente no banco.
- `render.yaml`: configuração para deploy gratuito no Render.

## Como abrir

Configure a variável `DATABASE_URL` com a conexão PostgreSQL e execute:

```bash
npm start
```

Depois acesse:

```text
http://localhost:4173/login.html
```

## Como publicar grátis

Opção recomendada: Render.

1. Suba esta pasta para um repositório no GitHub.
2. Acesse `https://render.com`.
3. Crie um Blueprint usando o `render.yaml` do repositório.
4. O Render criará o Web Service, o PostgreSQL e a variável `DATABASE_URL`.
5. O Render vai gerar um link grátis parecido com:

```text
https://shapehub.onrender.com
```

Esse link pode ser enviado para outras pessoas acessarem o site.

## Segurança

- Senhas protegidas com `scrypt` e salt aleatório.
- Consultas PostgreSQL parametrizadas.
- Limite de tentativas nas rotas de autenticação.
- Validação de nome, e-mail e senha.
- Cabeçalhos HTTP contra carregamento indevido e enquadramento por terceiros.
