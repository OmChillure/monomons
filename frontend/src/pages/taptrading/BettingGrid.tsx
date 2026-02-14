import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, Coins, TrendingUp } from 'lucide-react';

interface PricePoint {
  time: string;
  price: number;
}

interface Bet {
  id: string;
  colIndex: number;
  rowIndex: number;
  targetPrice: number;
  amount: number;
  multiplier: number;
  status: 'pending' | 'won' | 'lost';
  checked?: boolean;
}

// Config Constants - Optimized for BTC
const CELL_WIDTH = 100;
const CELL_HEIGHT = 60;
const PRICE_STEP = 25; // $25 increments
const HEAD_SCREEN_X = 250;
const TIME_PER_CELL = 1.0;

function getSplinePath(points: { x: number, y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  
  return d;
}

function BettingGrid({ currentPrice, balance, onBetResult, priceHistory }: {
  currentPrice: number;
  balance: number;
  onBetResult: (won: boolean, amount: number, multiplier: number) => void;
  priceHistory: PricePoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const connectorPathRef = useRef<SVGPathElement>(null);
  
  const cameraXRef = useRef(0);
  const layoutRef = useRef<number | undefined>(undefined);
  const smoothHeadPriceRef = useRef(currentPrice);
  const lastDataTimeRef = useRef(Date.now());
  const initialSyncDone = useRef(false);
  
  const [bets, setBets] = useState<Bet[]>([]);
  const betsRef = useRef<Bet[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [cameraPrice, setCameraPrice] = useState(currentPrice);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => { betsRef.current = bets; }, [bets]);

  useEffect(() => {
    const updateDim = () => {
      if (containerRef.current) {
        setDimensions({ 
          width: containerRef.current.clientWidth, 
          height: containerRef.current.clientHeight 
        });
      }
    };
    window.addEventListener('resize', updateDim);
    updateDim();
    return () => window.removeEventListener('resize', updateDim);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCameraPrice(prev => {
        const diff = currentPrice - prev;
        if (Math.abs(diff) < 0.1) return currentPrice;
        return prev + diff * 0.1;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [currentPrice]);

  useEffect(() => {
    if (priceHistory.length > 0) {
      lastDataTimeRef.current = Date.now();
      
      if (!initialSyncDone.current) {
        const targetHeadX = (priceHistory.length - 1) * CELL_WIDTH + (CELL_WIDTH / 2);
        cameraXRef.current = targetHeadX - HEAD_SCREEN_X;
        smoothHeadPriceRef.current = currentPrice;
        initialSyncDone.current = true;
      }
    }
  }, [priceHistory.length, currentPrice]);

  const centerY = dimensions.height / 2;
  const centerRow = Math.floor(cameraPrice / PRICE_STEP);

  const animate = useCallback(() => {
    if (priceHistory.length > 0) {
      const timeSinceUpdate = (Date.now() - lastDataTimeRef.current) / 1000;
      const clampedTime = Math.min(timeSinceUpdate, 1.5);
      
      const baseHeadX = (priceHistory.length - 1) * CELL_WIDTH + (CELL_WIDTH / 2);
      const headOffset = clampedTime * (CELL_WIDTH / TIME_PER_CELL);
      const currentHeadX = baseHeadX + headOffset;
      
      const targetCamera = currentHeadX - HEAD_SCREEN_X;
      cameraXRef.current += (targetCamera - cameraXRef.current) * 0.15;
      
      const headWorldX = currentHeadX;
      const pendingBets = betsRef.current.filter(b => b.status === 'pending' && !b.checked);
      let stateChanged = false;
      let newBets = [...betsRef.current];
      
      pendingBets.forEach(bet => {
        const betCenterWorldX = (bet.colIndex * CELL_WIDTH) + (CELL_WIDTH / 2);
        
        if (headWorldX >= betCenterWorldX) {
          const rowBottom = bet.rowIndex * PRICE_STEP;
          const rowTop = (bet.rowIndex + 1) * PRICE_STEP;
          const won = currentPrice >= rowBottom && currentPrice < rowTop;
          
          newBets = newBets.map(b => 
            b.id === bet.id 
              ? { ...b, status: won ? 'won' : 'lost', checked: true } 
              : b
          );
          
          stateChanged = true;
          onBetResult(won, bet.amount, bet.multiplier);
        }
      });
      
      if (stateChanged) setBets(newBets);
      
      if (connectorPathRef.current && lastPointRef.current && priceHistory.length >= 2) {
        const lp = lastPointRef.current;
        const lastPoint = priceHistory[priceHistory.length - 1];
        const prevPoint = priceHistory[priceHistory.length - 2];
        const priceVelocity = (lastPoint.price - prevPoint.price) / TIME_PER_CELL;
        
        const extrapolatedPrice = lastPoint.price + (priceVelocity * clampedTime);
        const blendedPrice = extrapolatedPrice * 0.7 + currentPrice * 0.3;
        smoothHeadPriceRef.current = blendedPrice;
        
        const diff = blendedPrice - cameraPrice;
        const headY = centerY - (diff / PRICE_STEP * CELL_HEIGHT);
        
        const d = `M ${lp.x} ${lp.y} L ${currentHeadX} ${headY}`;
        connectorPathRef.current.setAttribute('d', d);
      }
    }
    
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translateX(${-cameraXRef.current}px)`;
    }
    
    layoutRef.current = requestAnimationFrame(animate);
  }, [priceHistory, currentPrice, cameraPrice, centerY, onBetResult]);

  useEffect(() => {
    layoutRef.current = requestAnimationFrame(animate);
    return () => {
      if (layoutRef.current) cancelAnimationFrame(layoutRef.current);
    };
  }, [animate]);

  const handleCellClick = (colIndex: number, rowIndex: number) => {
    const headWorldX = cameraXRef.current + HEAD_SCREEN_X;
    const betWorldX = colIndex * CELL_WIDTH + (CELL_WIDTH / 2);
    
    if (betWorldX <= headWorldX) return;
    if (balance < 1) return;
    if (bets.some(b => b.colIndex === colIndex && b.rowIndex === rowIndex)) return;
    
    const currentRow = Math.floor(currentPrice / PRICE_STEP);
    const rowDist = Math.abs(rowIndex - currentRow);
    const timeDist = Math.max(0, (betWorldX - headWorldX) / CELL_WIDTH);
    
    const baseMult = 1.0 + (rowDist * 0.3) + (timeDist * 0.15);
    const multiplier = parseFloat((Math.pow(baseMult, 1.8)).toFixed(2));
    
    const newBet: Bet = {
      id: Math.random().toString(36),
      colIndex,
      rowIndex,
      targetPrice: (rowIndex + 0.5) * PRICE_STEP,
      amount: 1,
      multiplier,
      status: 'pending',
      checked: false,
    };
    
    setBets(prev => [...prev, newBet]);
  };

  const currentDataTick = priceHistory.length;
  const startCol = Math.max(0, currentDataTick - 8);
  const endCol = currentDataTick + 20;
  
  const colsToRender = [];
  for (let c = startCol; c <= endCol; c++) colsToRender.push(c);
  
  const visibleRows = 12;
  const rowsToRender: number[] = [];
  for (let r = centerRow - visibleRows; r <= centerRow + visibleRows; r++) {
    rowsToRender.push(r);
  }

  const historyPoints = useMemo(() => {
    return priceHistory.map((pt, i) => {
      const x = (i * CELL_WIDTH) + (CELL_WIDTH / 2);
      const diff = pt.price - cameraPrice;
      const y = centerY - (diff / PRICE_STEP * CELL_HEIGHT);
      return { x, y };
    });
  }, [priceHistory, cameraPrice, centerY]);

  useEffect(() => {
    if (historyPoints.length > 0) {
      lastPointRef.current = historyPoints[historyPoints.length - 1];
    } else {
      lastPointRef.current = { x: 0, y: centerY };
    }
  }, [historyPoints, centerY]);

  const historyPathD = useMemo(() => getSplinePath(historyPoints), [historyPoints]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <div>
                <div className="text-xs text-slate-400">BTC Price</div>
                <div className="text-lg font-bold text-white">
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs text-slate-400">Balance</div>
              <div className="text-lg font-bold text-emerald-400">
                ${balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 top-16">
        <svg 
          className="absolute inset-0 pointer-events-none z-20"
          style={{ width: '100%', height: '100%' }}
        >
          <path
            d={historyPathD}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' }}
          />
          
          <path
            ref={connectorPathRef}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5,5"
            opacity="0.6"
          />
          
          <circle
            cx={HEAD_SCREEN_X}
            cy={centerY}
            r="8"
            fill="rgb(59, 130, 246)"
            stroke="white"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))' }}
          />
        </svg>

        <div 
          ref={canvasRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{ height: '100%' }}
        >
          {colsToRender.map(colIdx => {
            const x = colIdx * CELL_WIDTH;
            const isDataColumn = colIdx < priceHistory.length;
            const timeLabel = isDataColumn && priceHistory[colIdx] 
              ? new Date(priceHistory[colIdx].time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', minute: '2-digit', second: '2-digit' 
                })
              : '';
            
            return (
              <div
                key={colIdx}
                className="absolute top-0 bottom-0"
                style={{ left: `${x}px`, width: `${CELL_WIDTH}px` }}
              >
                {timeLabel && colIdx % 2 === 0 && (
                  <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-500 font-mono">
                    {timeLabel}
                  </div>
                )}
                
                {rowsToRender.map((rowIdx) => {
                  const price = rowIdx * PRICE_STEP;
                  const diff = price - cameraPrice;
                  const y = centerY - (diff / PRICE_STEP * CELL_HEIGHT) - (CELL_HEIGHT / 2);
                  
                  const bet = bets.find(b => b.colIndex === colIdx && b.rowIndex === rowIdx);
                  
                  const currentRow = Math.floor(currentPrice / PRICE_STEP);
                  const rowDist = Math.abs(rowIdx - currentRow);
                  const colDist = Math.abs(colIdx - currentDataTick);
                  const displayMult = (Math.pow(1.0 + (rowDist * 0.3) + (colDist * 0.15), 1.8)).toFixed(1);
                  
                  const isCurrentPriceRow = rowIdx === currentRow;
                  
                  return (
                    <div
                      key={rowIdx}
                      className="absolute"
                      style={{ 
                        left: '2px',
                        top: `${y}px`,
                        width: `${CELL_WIDTH - 4}px`,
                        height: `${CELL_HEIGHT - 4}px`,
                      }}
                    >
                      <div
                        className={`
                          w-full h-full rounded-lg border transition-all cursor-pointer
                          flex flex-col items-center justify-center
                          ${bet 
                            ? bet.status === 'won'
                              ? 'bg-emerald-500/30 border-emerald-400 shadow-lg shadow-emerald-500/50'
                              : bet.status === 'lost'
                              ? 'bg-red-500/30 border-red-400 shadow-lg shadow-red-500/50'
                              : 'bg-blue-500/30 border-blue-400 shadow-lg shadow-blue-500/50'
                            : isCurrentPriceRow
                            ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                            : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/40'
                          }
                        `}
                        onClick={() => handleCellClick(colIdx, rowIdx)}
                      >
                        {bet ? (
                          <>
                            <div className="text-sm font-bold text-white">{bet.multiplier}x</div>
                            <div className="text-xs text-slate-300">${bet.amount}</div>
                          </>
                        ) : (
                          <div className="text-xs font-semibold text-slate-400">
                            {displayMult}x
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10">
          {Array.from({ length: 9 }, (_, i) => {
            const offset = i - 4;
            const price = cameraPrice + (offset * PRICE_STEP);
            const y = centerY - (offset * CELL_HEIGHT);
            const isCurrentPrice = Math.abs(price - currentPrice) < PRICE_STEP / 2;
            
            return (
              <div
                key={i}
                className="absolute right-4 transform -translate-y-1/2"
                style={{ top: `${y}px` }}
              >
                <div className={`
                  text-sm font-mono px-2 py-1 rounded
                  ${isCurrentPrice 
                    ? 'bg-orange-500/30 text-orange-300 font-bold' 
                    : 'text-slate-400'
                  }
                `}>
                  ${price.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>

        <div 
          className="absolute left-0 right-0 border-t-2 border-orange-500/50 pointer-events-none z-10"
          style={{ top: `${centerY}px` }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 -top-3">
            <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(95000);
  const [balance, setBalance] = useState(100);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to Binance WebSocket');
          setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const price = parseFloat(data.c);
            
            if (!isNaN(price) && price > 0) {
              setCurrentPrice(price);
              
              setPriceHistory(prev => {
                const now = new Date().toISOString();
                const newPoint = { time: now, price };
                const updated = [...prev, newPoint];
                return updated.slice(-300);
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('disconnected');
        };

        ws.onclose = () => {
          console.log('WebSocket closed, reconnecting...');
          setConnectionStatus('disconnected');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setConnectionStatus('disconnected');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (connectionStatus === 'disconnected' && priceHistory.length === 0) {
      const interval = setInterval(() => {
        const volatility = 0.0002;
        const change = (Math.random() - 0.5) * 2 * volatility;
        
        setCurrentPrice(prev => {
          const newPrice = prev * (1 + change);
          const now = new Date().toISOString();
          
          setPriceHistory(ph => {
            const updated = [...ph, { time: now, price: newPrice }];
            return updated.slice(-300);
          });
          
          return newPrice;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus, priceHistory.length]);

  const handleBetResult = (won: boolean, amount: number, multiplier: number) => {
    if (won) {
      const winnings = amount * multiplier;
      setBalance(prev => prev + winnings);
    } else {
      setBalance(prev => prev - amount);
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700/50">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' 
            ? 'bg-emerald-400 animate-pulse' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-red-400'
        }`} />
        <span className="text-xs text-slate-300">
          {connectionStatus === 'connected' 
            ? 'Live BTC Data' 
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Reconnecting...'}
        </span>
      </div>

      {priceHistory.length < 5 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-500/20 backdrop-blur-sm px-6 py-3 rounded-lg border border-blue-400/30">
          <p className="text-blue-200 text-sm text-center">
            🎮 Loading live Bitcoin data... Place bets on future price levels!
          </p>
        </div>
      )}

      <BettingGrid
        currentPrice={currentPrice}
        balance={balance}
        onBetResult={handleBetResult}
        priceHistory={priceHistory}
      />

      {balance < 10 && balance > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-yellow-500/20 backdrop-blur-sm px-6 py-4 rounded-lg border border-yellow-400/30">
          <p className="text-yellow-200 text-center font-bold">
            ⚠️ Low Balance: ${balance.toFixed(2)}
          </p>
        </div>
      )}

      {balance <= 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-red-500/20 backdrop-blur-sm px-8 py-6 rounded-lg border border-red-400/30">
          <p className="text-red-200 text-center font-bold text-lg mb-3">
            Game Over!
          </p>
          <button
            onClick={() => setBalance(100)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            Reset Balance ($100)
          </button>
        </div>
      )}
    </div>
  );
}