# Altverse: The Unified Crypto Interface

#### Core Features:
- Swapping & Bridging across the EVM, Solana, and Sui ecosystems
- (Automated) Farming/Vaulting with optimal yields **with assets sourced from any chain**
- Lending/Borrowing at optimal rates
- Unified dashboard of activity
- Omni-chain APIs/smart contracts
- Fiat on-ramp/off-ramp

---

![image](https://github.com/user-attachments/assets/2817df45-8c21-47ab-bd51-1e19861a7eb2)

Altverse is a project inspired by the many pain points associated with using the ever-growing number of useful tools and features separated by segregated protocols, chains and dApps. Altverse aims to create a unified user experience by offering exposure to the best of Web3 in a single place, regardless of what chain user assets are sourced from.

---

![Screenshot 2025-05-17 at 12 42 04 pm](https://github.com/user-attachments/assets/9a957a44-b48a-471f-ae8d-3d493ffd8517)

Our platform does more than just aggregate protocols - we abstract away complexities, giving our users a single, simple, and easy-to-use platform for all their needs.

---

## Quick links
- [Website](https://altverse.finance)
- [Token Fetcher Repository](https://github.com/altverseweb3/token-fetcher)
- [Backend Repository](https://github.com/altverseweb3/backend)

## `site`
This repository is the frontend component for our project. The Altverse frontend enables users to connect up to 3 different wallets simultaneously across a selection of EVM, Solana and Sui wallets, providing an interface for users from all different chains to swap and stake tokens across Web3 seamlessly.

## Tech stack
### Frontend
- [**NextJS**](https://nextjs.org/): core web development framework
- [**Tailwind CSS**](https://tailwindcss.com/): for tailwind utility classes to style components consistently and quickly without additional boilerplate
- [**Zustand**](https://zustand.docs.pmnd.rs/getting-started/introduction): for lightweight and fast storage across components and site refreshes
- [**Shadcn**](https://ui.shadcn.com/): reusable UI component library
- [**AWS Lambda**](https://github.com/altverseweb3/backend/blob/main/lambda/lambda_function.py): to support our frontend with a serverless API

### Web3
- [**Reown**](https://reown.com/): wallet kit to support a scalable selection of wallets across networks (currently used for Solana and EVM)
- [**Suiet**](https://kit.suiet.app/): wallet provider for the Sui network
- [**Mayan SDK**](https://www.npmjs.com/package/@mayanfinance/swap-sdk): cross-chain SDK to facilitate cross-chain & cross-environment swaps
- [**CoinGecko API**](https://www.coingecko.com/en/api): token list information and token metadata
- [**Alchemy API**](https://www.alchemy.com/docs/): for user token balances, allowances, and price feeds
- [**BlockVision API**](https://blockvision.org/): for user token balances, allowances, and price feeds

### DevOps
- [**Vercel**](https://vercel.com): for swift automatic site deployments
- [**Husky**](https://typicode.github.io/husky/): to add `pre-commit` and `pre-push` git hooks to format and lint our repository
- [**GitHub Actions**](https://github.com/altverseweb3/token-fetcher/blob/master/.github/workflows/main.yml): to enable token metadata refreshes and site redeployments automatically

## How to run locally
```bash
# Install dependencies
npm install
# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view Altverse in your browser.

## Repository Structure

Below is a simplified explanation of our repository structure:
```
site/
├── public/ # contains all our images and token metadata
│   ├── images/
│   ├── protocols/
│   ├── tokens/
│   └── wallets/
├── src/
│   ├── api/    # api for our backend
│   ├── app/    # landing page
│   │   ├── (dapp)/     # contains pages inside the dapp
│   │   │   ├── borrow/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── swap/
│   │   │       └── page.tsx
│   │   ├── favicon.ico
│   │   ├── ...
│   ├── components/
│   │   ├── layout/ # core visual components used across the site
│   │   │   ├── MainNav.tsx
│   │   │   ├── SiteFooter.tsx
│   │   │   ├── ...
│   │   └── ui/     # reusable visual components
│   │       ├── Accordion.tsx
│   │       ├── AlertDialog.tsx
│   │       ├── ...
│   ├── config/     # site configuration (e.g. what chains we support)
│   │   ├── chains.ts
│   │   └── tabs.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── store/      # Zustand storage contexts
│   │   ├── uiStore.ts
│   │   └── web3Store.ts
│   ├── types/      # reusable type definitions
│   │   ├── ui.ts
│   │   ├── web3.ts
│   │   └── window.d.ts
│   └── utils/      # reusable helper/wrapper functions
│       ├── chainMethods.ts
│       ├── mayanSwapMethods.ts
│       ├── ...
```

