export interface ConstructorArg {
  name: string;
  type: 'string' | 'uint256' | 'address' | 'address[]';
  placeholder: string;
  defaultValue?: string;
  description?: string;
}

export interface ContractConstructorConfig {
  args: ConstructorArg[];
}

export const CONSTRUCTOR_CONFIGS: Record<string, ContractConstructorConfig> = {
  'SimpleStorage': {
    args: []
  },
  'ERC20': {
    args: [
      {
        name: '_name',
        type: 'string',
        placeholder: 'e.g., My Token',
        description: 'Token name'
      },
      {
        name: '_symbol',
        type: 'string',
        placeholder: 'e.g., MTK',
        description: 'Token symbol'
      },
      {
        name: '_initialSupply',
        type: 'uint256',
        placeholder: 'e.g., 1000000',
        description: 'Initial supply (will be multiplied by 10^18)'
      }
    ]
  },
  'ERC721': {
    args: [
      {
        name: '_name',
        type: 'string',
        placeholder: 'e.g., My NFT Collection',
        description: 'NFT collection name'
      },
      {
        name: '_symbol',
        type: 'string',
        placeholder: 'e.g., MNFT',
        description: 'NFT symbol'
      }
    ]
  },
  'Crowdfunding': {
    args: [
      {
        name: '_goal',
        type: 'uint256',
        placeholder: 'e.g., 1000000000000000000',
        description: 'Funding goal in wei (1 ETH = 10^18 wei)',
        defaultValue: '1000000000000000000'
      },
      {
        name: '_durationInDays',
        type: 'uint256',
        placeholder: 'e.g., 30',
        description: 'Campaign duration in days',
        defaultValue: '30'
      }
    ]
  },
  'Voting': {
    args: []
  },
  'MultiSig': {
    args: [
      {
        name: '_owners',
        type: 'address[]',
        placeholder: 'e.g., 0x123..., 0x456..., 0x789...',
        description: 'Comma-separated list of owner addresses'
      },
      {
        name: '_required',
        type: 'uint256',
        placeholder: 'e.g., 2',
        description: 'Number of required confirmations'
      }
    ]
  }
};

export function getConstructorConfig(contractType: string): ContractConstructorConfig {
  return CONSTRUCTOR_CONFIGS[contractType] || { args: [] };
}

export function parseConstructorArgs(
  config: ContractConstructorConfig,
  values: Record<string, string>
): unknown[] {
  return config.args.map(arg => {
    const value = values[arg.name];
    
    switch (arg.type) {
      case 'string':
        return value;
      
      case 'uint256':
        return BigInt(value || '0');
      
      case 'address':
        return value;
      
      case 'address[]':
        // Parse comma-separated addresses
        return value
          .split(',')
          .map(addr => addr.trim())
          .filter(addr => addr.length > 0);
      
      default:
        return value;
    }
  });
}
