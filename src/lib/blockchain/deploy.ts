import { ethers } from 'ethers';

export interface DeployResult {
  address: string;
  txHash: string;
}

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
export const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock your wallet.');
  }

  return accounts[0];
}

export async function ensureSepoliaNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please connect your wallet first.');
  }

  const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;

  if (chainId !== SEPOLIA_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      // Chain not added — add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } else {
        throw new Error('Failed to switch to Sepolia network. Please switch manually.');
      }
    }
  }
}

export async function deployContract(
  abi: unknown[],
  bytecode: string,
  constructorArgs: unknown[] = []
): Promise<DeployResult> {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please connect your wallet first.');
  }

  if (!bytecode || bytecode === '0x') {
    throw new Error('Invalid bytecode. Please compile the contract first.');
  }

  // Ensure we're on Sepolia
  await ensureSepoliaNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Cast abi to InterfaceAbi
  const factory = new ethers.ContractFactory(abi as ethers.InterfaceAbi, bytecode, signer);
  const contract = await factory.deploy(...constructorArgs);
  
  const deployTx = contract.deploymentTransaction();
  if (!deployTx) {
    throw new Error('Deployment transaction not found.');
  }

  // Wait for confirmation
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  return {
    address,
    txHash: deployTx.hash,
  };
}

export function getEtherscanUrl(addressOrHash: string, type: 'address' | 'tx' = 'address'): string {
  return `https://sepolia.etherscan.io/${type}/${addressOrHash}`;
}
