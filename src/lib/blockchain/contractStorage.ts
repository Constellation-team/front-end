/**
 * Contract deployment storage system
 * Tracks deployed contracts and their metadata
 */

export interface DeployedContract {
  nodeId: string;
  type: string;
  name: string;
  address: string;
  txHash: string;
  abi: unknown[];
  sourceCode: string;
  deployedAt: number;
  network: 'sepolia';
}

const STORAGE_KEY = 'deployed_contracts';

export function saveDeployedContract(contract: DeployedContract): void {
  const contracts = getDeployedContracts();
  contracts.push(contract);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function getDeployedContracts(): DeployedContract[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getContractByNodeId(nodeId: string): DeployedContract | undefined {
  const contracts = getDeployedContracts();
  return contracts.find(c => c.nodeId === nodeId);
}

export function deleteContract(nodeId: string): void {
  const contracts = getDeployedContracts().filter(c => c.nodeId !== nodeId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function clearAllContracts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
