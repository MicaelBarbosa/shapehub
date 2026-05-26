# ShapeHub

Site acadêmico de treinos personalizados, com frontend responsivo, simulador de sugestão de treino e backend simples em Node.js para login/cadastro.

## Estrutura

- `index.html`: estrutura principal da página.
- `login.html`: tela de login e cadastro.
- `perfil.html`: perfil do usuário.
- `meu-treino.html`: treino salvo.
- `css/style.css`: estilos, responsividade e identidade visual.
- `js/script.js`: interações, botões e gerador de treino.
- `server.js`: backend Node.js e servidor dos arquivos do site.
- `data/db.json`: criado automaticamente para armazenar contas no servidor.
- `render.yaml`: configuração para deploy gratuito no Render.

## Como abrir

Execute:

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
3. Crie um novo `Web Service`.
4. Conecte o repositório do ShapeHub.
5. Use:
   - Runtime: `Node`
   - Build command: vazio
   - Start command: `npm start`
   - Plan: `Free`
6. O Render vai gerar um link grátis parecido com:

```text
https://shapehub.onrender.com
```

Esse link pode ser enviado para outras pessoas acessarem o site.
