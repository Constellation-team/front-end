/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Web Worker that loads and runs the Solidity compiler off the main thread.
 * Communication:
 *   Main → Worker:  { type: 'compile', source: string }
 *   Worker → Main:  { type: 'ready' }
 *                    { type: 'result', data: { success, result?, errors? } }
 *                    { type: 'error', message: string }
 */

// ── Compiler input builder ──────────────────────────────────────────

function createCompilerInput(source: string): string {
  return JSON.stringify({
    language: 'Solidity',
    sources: {
      'Contract.sol': { content: source },
    },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  });
}

// ── Load the compiler inside the worker ─────────────────────────────

let compileFn: ((input: string) => string) | null = null;

async function loadCompiler(): Promise<void> {
  if (compileFn) return;

  // importScripts is the standard way to load scripts in classic workers
  (self as any).importScripts(
    'https://binaries.soliditylang.org/bin/soljson-v0.8.28+commit.7893614a.js'
  );

  // After importScripts, Module should be available synchronously
  // but cwrap may need the WASM runtime to finish initialising,
  // so we poll briefly just like the original code.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(poll);
      reject(new Error('Compiler init timed out after 120 s.'));
    }, 120_000);

    const poll = setInterval(() => {
      const mod = (self as any).Module;
      if (mod && typeof mod.cwrap === 'function') {
        clearInterval(poll);
        clearTimeout(timeout);
        try {
          const fn: (input: string, cb: number) => string = mod.cwrap(
            'solidity_compile',
            'string',
            ['string', 'number']
          );
          compileFn = (input: string) => fn(input, 0);
          resolve();
        } catch (err) {
          reject(new Error('Failed to initialise solc: ' + String(err)));
        }
      }
    }, 200);
  });
}

// ── Process compilation requests ────────────────────────────────────

interface CompileMessage {
  type: 'compile';
  source: string;
}

self.onmessage = async (e: MessageEvent<CompileMessage>) => {
  if (e.data.type !== 'compile') return;

  try {
    await loadCompiler();

    const inputJSON = createCompilerInput(e.data.source);
    const outputJSON = compileFn!(inputJSON);
    const output = JSON.parse(outputJSON);

    // Filter actual errors (ignore warnings)
    const errors = (output.errors || []).filter(
      (err: { severity: string }) => err.severity === 'error'
    );

    if (errors.length > 0) {
      self.postMessage({
        type: 'result',
        data: {
          success: false,
          errors: errors.map((err: { severity: string; formattedMessage: string }) => ({
            severity: err.severity,
            formattedMessage: err.formattedMessage,
          })),
        },
      });
      return;
    }

    const contracts = output.contracts?.['Contract.sol'];
    if (!contracts) {
      self.postMessage({
        type: 'result',
        data: {
          success: false,
          errors: [{ severity: 'error', formattedMessage: 'No contracts found in the source code.' }],
        },
      });
      return;
    }

    const contractName = Object.keys(contracts)[0];
    const contract = contracts[contractName];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    if (!bytecode || bytecode.length === 0) {
      self.postMessage({
        type: 'result',
        data: {
          success: false,
          errors: [{ severity: 'error', formattedMessage: 'Compilation produced empty bytecode.' }],
        },
      });
      return;
    }

    self.postMessage({
      type: 'result',
      data: {
        success: true,
        result: { abi, bytecode: '0x' + bytecode },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message });
  }
};

// Signal that the worker script itself has loaded
self.postMessage({ type: 'ready' });
