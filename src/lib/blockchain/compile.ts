/**
 * Solidity compilation bridge.
 * Compilation now happens on the backend server via API call.
 */

import { API_URL } from '../../config';

export interface CompilationResult {
  abi: unknown[];
  bytecode: string;
}

export interface CompilationError {
  severity: string;
  formattedMessage: string;
}

type WorkerResult =
  | { success: true; result: CompilationResult }
  | { success: false; errors: CompilationError[] };

/**
 * Compile Solidity source code via backend API.
 * Returns the same interface as before so existing consumers don't need changes.
 */
export async function compileSolidity(
  source: string
): Promise<WorkerResult> {
  try {
    const response = await fetch(`${API_URL}/api/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceCode: source }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Compilation error:', error);
    return {
      success: false,
      errors: [{
        formattedMessage: error instanceof Error ? error.message : 'Unknown compilation error',
        severity: 'error'
      }]
    };
  }
}
