/**
 * Solidity compilation bridge.
 * All heavy work (downloading solc, running the compiler) happens inside
 * a Web Worker so the main UI thread stays responsive.
 */

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

// Singleton worker instance — created on first compile
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./compile.worker.ts', import.meta.url),
      { type: 'classic' }          // classic worker so importScripts works
    );
  }
  return worker;
}

/**
 * Compile Solidity source code.
 * The public API is identical to the previous synchronous version so
 * existing consumers (ContractEditor, App) require zero changes.
 */
export async function compileSolidity(
  source: string
): Promise<
  | { success: true; result: CompilationResult }
  | { success: false; errors: CompilationError[] }
> {
  return new Promise((resolve) => {
    const w = getWorker();

    const handler = (e: MessageEvent) => {
      if (e.data.type === 'result') {
        w.removeEventListener('message', handler);
        resolve(e.data.data as WorkerResult);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        resolve({
          success: false,
          errors: [
            { severity: 'error', formattedMessage: `Compilation failed: ${e.data.message}` },
          ],
        });
      }
      // Ignore 'ready' messages
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'compile', source });
  });
}
