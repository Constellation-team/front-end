import { 
    FaClock, 
    FaBell, 
    FaPlay, 
    FaGlobe, 
    FaChartLine, 
    FaCodeBranch, 
    FaSlidersH,
    FaProjectDiagram,
    FaEye,
    FaExchangeAlt,
    FaBolt,
    FaFileContract,
    FaHeadphones,
    FaBox,
    FaCoins,
    FaImage,
    FaDollarSign,
    FaVoteYea,
    FaLock,
    FaRobot,
    FaCommentDots,
    FaUser,
    FaTimes,
    FaLightbulb,
    FaCog,
    FaTrash,
    FaSave,
    FaCopy,
    FaExternalLinkAlt,
    FaCheck,
    FaSyncAlt,
    FaSearch,
    FaRocket,
    FaHammer,
    FaLink,
    FaBrain,
    FaDatabase
} from 'react-icons/fa';
import { 
    MdCheckCircle, 
    MdError, 
    MdWarning 
} from 'react-icons/md';

// Map of emoji/icon identifiers to React Icon components
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    // Triggers
    '⏰': FaClock,
    'clock': FaClock,
    '🔔': FaBell,
    'bell': FaBell,
    '🎯': FaPlay,
    'play': FaPlay,
    '🎬': FaPlay,
    
    // Data Sources
    '🌐': FaGlobe,
    'globe': FaGlobe,
    '📊': FaChartLine,
    'chart': FaChartLine,
    '📡': FaDatabase,
    'database': FaDatabase,
    
    // Logic
    '🔀': FaCodeBranch,
    'branch': FaCodeBranch,
    '🔧': FaSlidersH,
    'sliders': FaSlidersH,
    '🔗': FaLink,
    'link': FaLink,
    '🧠': FaBrain,
    'brain': FaBrain,
    
    // Chainlink
    '🔮': FaEye,
    'eye': FaEye,
    '🌉': FaExchangeAlt,
    'bridge': FaExchangeAlt,
    '⚡': FaBolt,
    'bolt': FaBolt,
    
    // Blockchain
    '📝': FaFileContract,
    'contract': FaFileContract,
    '👂': FaHeadphones,
    'headphones': FaHeadphones,
    '📦': FaBox,
    'box': FaBox,
    '⛓️': FaLink,
    'chain': FaLink,
    '🪙': FaCoins,
    'coins': FaCoins,
    '🖼️': FaImage,
    'image': FaImage,
    '💰': FaDollarSign,
    'dollar': FaDollarSign,
    '🗳️': FaVoteYea,
    'vote': FaVoteYea,
    '🔐': FaLock,
    'lock': FaLock,
    
    // AI
    '🤖': FaRobot,
    'robot': FaRobot,
    
    // UI Elements
    '💬': FaCommentDots,
    'comment': FaCommentDots,
    '👤': FaUser,
    'user': FaUser,
    '✕': FaTimes,
    'times': FaTimes,
    '💡': FaLightbulb,
    'lightbulb': FaLightbulb,
    '⚙️': FaCog,
    'cog': FaCog,
    '🗑️': FaTrash,
    'trash': FaTrash,
    '💾': FaSave,
    'save': FaSave,
    '📋': FaCopy,
    'copy': FaCopy,
    '🔍': FaSearch,
    'search': FaSearch,
    '✅': MdCheckCircle,
    'check': MdCheckCircle,
    '❌': MdError,
    'error': MdError,
    '⚠️': MdWarning,
    'warning': MdWarning,
    '🔄': FaSyncAlt,
    'sync': FaSyncAlt,
    '🚀': FaRocket,
    'rocket': FaRocket,
    '🔨': FaHammer,
    'hammer': FaHammer,
    'external': FaExternalLinkAlt,
};

interface IconMapperProps {
    icon: string;
    className?: string;
    size?: number;
}

/**
 * Maps emoji or icon identifier strings to React Icons components
 * Falls back to text rendering if no mapping exists
 */
export function IconMapper({ icon, className = '', size }: IconMapperProps) {
    const IconComponent = iconMap[icon];
    
    if (IconComponent) {
        return <IconComponent className={className} size={size} />;
    }
    
    // Fallback to emoji text if no mapping
    return <span className={className}>{icon}</span>;
}

// Export individual icons for direct use
export {
    FaClock,
    FaBell,
    FaPlay,
    FaGlobe,
    FaChartLine,
    FaCodeBranch,
    FaSlidersH,
    FaProjectDiagram,
    FaEye,
    FaExchangeAlt,
    FaBolt,
    FaFileContract,
    FaHeadphones,
    FaBox,
    FaCoins,
    FaImage,
    FaDollarSign,
    FaVoteYea,
    FaLock,
    FaRobot,
    FaCommentDots,
    FaUser,
    FaTimes,
    FaLightbulb,
    FaCog,
    FaTrash,
    FaSave,
    FaCopy,
    FaExternalLinkAlt,
    FaCheck,
    FaSyncAlt,
    FaSearch,
    FaRocket,
    FaHammer,
    MdCheckCircle,
    MdError,
    MdWarning,
};
