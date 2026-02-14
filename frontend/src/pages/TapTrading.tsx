import { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GameWebSocket, type ChatMessage } from '../services/GameWebSocket';
import { BettingGrid } from '../pages/taptrading';

interface PricePoint {
    time: string;
    price: number;
}

interface Player {
    id: string;
    name: string;
    color: string;
}


const INITIAL_PRICE = 2992.57;
const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const ROOM_ID = "tap-trading-global";

export default function TapTrading() {
    const { token } = useAuth();
    const wsRef = useRef<GameWebSocket | null>(null);

    const [data, setData] = useState<PricePoint[]>([]);
    const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
    const priceRef = useRef(INITIAL_PRICE);

    const [balance, setBalance] = useState(1000);

    const [players, setPlayers] = useState<Player[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');

    useEffect(() => {
        if (!token) return;

        const ws = new GameWebSocket(token);
        wsRef.current = ws;

        ws.connect();

        ws.onAuth(() => {
            ws.joinRoom(ROOM_ID);
        });

        ws.onRoomEvent({
            onState: (roomPlayers) => {
                setPlayers(roomPlayers.map(p => ({
                    id: p.id,
                    name: p.username || `Trader_${p.id.substr(0, 4)}`,
                    color: AVATAR_COLORS[p.id.charCodeAt(0) % AVATAR_COLORS.length]
                })));
            },
            onJoin: (p) => {
                setPlayers(prev => {
                    if (prev.find(existing => existing.id === p.id)) return prev;
                    return [...prev, {
                        id: p.id,
                        name: p.username || `Trader_${p.id.substr(0, 4)}`,
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
    }, [token]);

    useEffect(() => {
        const interval = setInterval(() => {
            const change = (Math.random() - 0.5) * 2;
            const newPrice = Number((priceRef.current + change).toFixed(2));
            priceRef.current = newPrice;
            setCurrentPrice(newPrice);

            setData(prev => {
                const newData = [...prev, {
                    time: new Date().toLocaleTimeString(),
                    price: newPrice
                }];
                // Keep a larger buffer for the scrolling grid
                if (newData.length > 5000) return newData.slice(1);
                return newData;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleBetResult = (won: boolean, amount: number, multiplier: number) => {
        const pnl = won ? amount * multiplier : -amount;
        setBalance(prev => prev + pnl);

        if (won) {
            setTimeout(() => {
            }, 100);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !wsRef.current) return;

        wsRef.current.sendChatMessage(ROOM_ID, inputMessage);
        setInputMessage('');
    };

    return (
        <div className="flex w-full h-screen bg-[#0a0a0a] overflow-hidden text-white font-space pt-16">
            <div className="flex-1 flex flex-col relative border-r border-gray-800 overflow-hidden">
                <BettingGrid
                    currentPrice={currentPrice}
                    balance={balance}
                    onBetResult={handleBetResult}
                    priceHistory={data}
                />
            </div>

            <div className="w-96 flex flex-col bg-[#161616] border-l border-gray-800">

                <div className="h-1/3 border-b border-gray-800 p-4 flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users size={16} />
                        Live Traders ({players.length})
                    </h2>

                    <div className="grid grid-cols-3 gap-3 overflow-y-auto custom-scrollbar">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="aspect-square flex flex-col items-center justify-center bg-[#202020] border border-gray-800 rounded-lg p-2 hover:border-gray-600 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-full mb-2 border-2 border-[#121212] shadow-sm transform hover:scale-110 transition-transform"
                                    style={{ backgroundColor: player.color }}
                                />
                                <span className="text-xs font-medium text-gray-300 truncate w-full text-center">
                                    {player.name}
                                </span>
                            </div>
                        ))}
                        {[...Array(6 - players.length)].map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="aspect-square flex items-center justify-center border border-dashed border-gray-800 rounded-lg opacity-30"
                            >
                                <span className="text-gray-700 text-xl">+</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-[#161616]">
                    <div className="p-3 border-b border-gray-800 bg-[#1a1a1a]">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={16} />
                            Trollbox
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-600 text-sm italic mt-10">
                                No messages yet.
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
                                className="w-full bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 placeholder-gray-600 transition-all font-sans"
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-yellow-400 disabled:opacity-50 disabled:hover:text-gray-400 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
