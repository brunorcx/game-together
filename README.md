This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backlog

The Backlog page is available at `/backlog`. It reads and updates a plain-text file selected on the page; its path is saved locally in `.backlog-config.json`. Use the floating **Add a game** button to open the game form. Games are grouped under system headings, for example:

```text
--- Nintendo Switch ---
Example Game (4?) -- Action
Another Game (?) -- RPG
```

The optional `?` after a player count indicates uncertain multiplayer support. Add comments on their own line below a game with `Comments: Your note here`. Use the **Edit** button on a game card to update its name, system, player count, comments, or upload a custom cover. Uploaded covers are resized in the browser to 1 MB or less. Edits are written back to the selected text file while preserving the game genre. Use **Complete game** to open the Score form with the game details filled in; the score is saved and the game is removed from the backlog only after a successful score save. Covers for removed games are cleaned up, while existing covers are preserved when an automatic cover search finds no replacement.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
