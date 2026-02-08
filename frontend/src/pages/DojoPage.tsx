import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GameWebSocket, type ChatMessage, type BattleState } from '../services/GameWebSocket';
import { BattleScene } from '../components/BattleComponents';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, parseAbi } from 'viem';
import { api } from '../lib/utils';

// Mock colors for avatars
const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];

type DojoPlayer = {
    id: string;
    name: string;
    color: string;
};

const CONTRACT_ADDRESS = "0x3B3aB1A308F352a43b1d10a2a0Fd4B81AF2C7413";
const CONTRACT_ABI = parseAbi([
    "function deposit() external payable"
]);

function DojoPage() {
    const { dojoName, roomId } = useParams();
    const { token } = useAuth();
    const { isConnected } = useAccount();
    const wsRef = useRef<GameWebSocket | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    
    // Betting State
    const { writeContractAsync, isPending: isBetting } = useWriteContract();
    const [betTxHash, setBetTxHash] = useState<string | null>(null);
    const { isSuccess: isBetConfirmed } = useWaitForTransactionReceipt({ hash: betTxHash as `0x${string}` });

    const [players, setPlayers] = useState<DojoPlayer[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [battleState, setBattleState] = useState<BattleState | null>(null);
    const [totalPool, setTotalPool] = useState<string>('0');

    // Track active bet attempt to sync with backend after confirmation
    const [pendingBetChoice, setPendingBetChoice] = useState<'playerA' | 'playerB' | null>(null);
    const [pendingBetAmount, setPendingBetAmount] = useState<string | null>(null);

    useEffect(() => {
        if (isBetConfirmed && betTxHash && pendingBetChoice && roomId && token && pendingBetAmount) {
            console.log("Bet confirmed on-chain! Notifying backend...");
            
            api.placeBet(roomId, pendingBetChoice, pendingBetAmount, betTxHash, token)
            .then(data => {
                console.log("Backend confirmed bet:", data);
                if (data.success) {
                    alert(`Bet placed on ${pendingBetChoice === 'playerA' ? 'Red' : 'Blue'}!`);
                    // Refresh pool balance
                    fetchPoolBalance();
                } else {
                    alert(`Bet failed: ${data.error}`);
                }
                setPendingBetChoice(null);
                setPendingBetAmount(null);
                setBetTxHash(null);
            })
            .catch(err => {
                console.error("Failed to notify backend of bet:", err);
                alert("Failed to register bet with backend");
            });
        }
    }, [isBetConfirmed, betTxHash, pendingBetChoice, roomId, token, pendingBetAmount]);

    const fetchPoolBalance = async () => {
        try {
            const result = await api.getTotalPool();
            if (result.success) {
                setTotalPool(result.total);
            }
        } catch (e) {
            console.error('Failed to fetch pool balance:', e);
        }
    };

    // Fetch pool balance on mount and every 10 seconds
    useEffect(() => {
        fetchPoolBalance();
        const interval = setInterval(fetchPoolBalance, 10000);
        return () => clearInterval(interval);
    }, []);

    const handlePlaceBet = async (choice: 'playerA' | 'playerB') => {
        if (!isConnected) {
            alert("Please connect your wallet first!");
            return;
        }

        const amount = prompt("Enter bet amount in MON:", "0.1");
        if (!amount || isNaN(Number(amount))) return;

        try {
            const weiAmount = parseEther(amount);
            const hash = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'deposit',
                value: weiAmount
            });
            
            console.log("Bet Tx Sent:", hash);
            setBetTxHash(hash);
            setPendingBetChoice(choice);
            setPendingBetAmount(weiAmount.toString());

        } catch (e) {
            console.error("Betting failed:", e);
            alert("Failed to place bet. Check console.");
        }
    };

    useEffect(() => {
        if (!token || !roomId) return;

        console.log("Connecting to Dojo WS...");
        const ws = new GameWebSocket(token);
        wsRef.current = ws;
        
        ws.connect();
        
        ws.onAuth((player) => {
            setMyId(player.id);
        });

        // Auto join room on successful auth
        ws.joinRoom(roomId); 

        ws.onBattleUpdate((state) => {
            setBattleState(state);
        });

        ws.onRoomEvent({
            onState: (roomPlayers) => {
                setPlayers(roomPlayers.map((p) => ({
                    id: p.id,
                    name: p.username || p.address.slice(0, 8),
                    color: AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]
                })));
            },
            onJoin: (p) => {
                setPlayers(prev => {
                    if (prev.find(existing => existing.id === p.id)) return prev;
                    return [...prev, {
                        id: p.id,
                        name: p.username || p.address.slice(0, 8),
                        color: AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]
                    }];
                });
            },
            onLeave: (playerId) => {
                setPlayers(prev => prev.filter(p => p.id !== playerId));
            },
            onMessage: (message) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        });

        return () => {
            ws.disconnect();
        };
    }, [token, roomId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !wsRef.current || !roomId) return;
        
        wsRef.current.sendChatMessage(roomId, inputMessage);
        setInputMessage('');
    };




    return (
        <div className="flex w-full h-screen bg-[#121212] overflow-hidden text-white">
            {/* Left Partition: Card Game Area */}
            <div className="flex-1 flex flex-col border-r border-gray-800 relative bg-[#0a0a0a]">
                <div className="absolute top-4 left-4 z-10">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 capitalize">
                        {dojoName?.replace(/-/g, ' ')}
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-1">Room: {roomId}</p>
                </div>
                
                <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                    {battleState ? (
                        <BattleScene state={battleState} />
                    ) : (
                        <div className="text-center p-10 border-2 border-dashed border-gray-800 rounded-xl">
                            <p className="text-gray-600 text-xl font-medium">Waiting for battle info...</p>
                            <p className="text-gray-700 text-sm mt-2">Connecting to game server...</p>
                        </div>
                    )}
                </div>

                {/* Betting Bar */}
                <div className="h-24 border-t border-gray-800 bg-[#111] p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 hover:border-red-500/30 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-500/20">A</div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 group-hover:text-red-400 transition-colors">
                                    {battleState ? battleState.playerA.name : 'Agent Red'}
                                </h3>
                            </div>
                        </div>
                        <button 
                            onClick={() => handlePlaceBet('playerA')}
                            disabled={isBetting}
                            className="px-4 py-2 rounded-lg bg-red-600/10 text-red-400 border border-red-600/20 text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isBetting && pendingBetChoice === 'playerA' ? 'Betting...' : `Bet ${battleState ? battleState.playerA.name.split(' ')[0] : 'Red'}`}
                        </button>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">VS</span>
                        <span className="text-[10px] text-gray-600 mt-1">Total Pool: {totalPool} MON</span>
                    </div>

                    <div className="flex-1 flex items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 hover:border-blue-500/30 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">B</div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors">
                                    {battleState ? battleState.playerB.name : 'Agent Blue'}
                                </h3>
                            </div>
                        </div>
                        <button 
                            onClick={() => handlePlaceBet('playerB')}
                            disabled={isBetting}
                            className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-600/20 text-xs font-bold uppercase hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isBetting && pendingBetChoice === 'playerB' ? 'Betting...' : `Bet ${battleState ? battleState.playerB.name.split(' ')[0] : 'Blue'}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Partition */}
            <div className="w-96 flex flex-col bg-[#161616]">
                
                {/* Top Right: Joined Players */}
                <div className="h-1/3 border-b border-gray-800 p-4 flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Players ({players.length})
                    </h2>
                    
                    <div className="grid grid-cols-3 gap-3 overflow-y-auto">
                        {players.map((player) => (
                            <div 
                                key={player.id} 
                                className="aspect-square flex flex-col items-center justify-center bg-[#202020] border border-gray-800 rounded-lg p-2 hover:border-gray-600 transition-colors"
                            >
                                <div 
                                    className="w-10 h-10 rounded-full mb-2 border-2 border-[#121212] shadow-sm"
                                    style={{ backgroundColor: player.color }}
                                />
                                <span className="text-xs font-medium text-gray-300 truncate w-full text-center">
                                    {player.name}
                                </span>
                            </div>
                        ))}
                        {/* Placeholder for empty slots */}
                        {[...Array(Math.max(0, 6 - players.length))].map((_, i) => (
                            <div 
                                key={`empty-${i}`} 
                                className="aspect-square flex items-center justify-center border border-dashed border-gray-800 rounded-lg opacity-50"
                            >
                                <span className="text-gray-700 text-xl">+</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Right: Chat */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#161616]">
                    <div className="p-3 border-b border-gray-800 bg-[#1a1a1a]">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Room Chat
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-600 text-sm italic mt-10">
                                No messages yet. Say hello!
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className="flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className={`text-xs font-bold ${msg.senderId === '1' ? 'text-yellow-500' : 'text-blue-400'}`}>
                                            {msg.senderName}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 break-words leading-relaxed">
                                        {msg.text}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-[#1a1a1a] border-t border-gray-800">
                        <div className="relative">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 placeholder-gray-600 transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-yellow-400 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.89 28.89 0 0015.293-7.154.75.75 0 000-1.115A28.89 28.89 0 003.105 2.289z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default DojoPage;
