import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import type { BattlePokemon, BattleState } from '../services/GameWebSocket';

export const PokemonCard = ({ pokemon, isActive, isOpponent }: { pokemon: BattlePokemon; isActive: boolean; isOpponent?: boolean }) => {
    const hpPercent = (pokemon.stats.hp / pokemon.stats.maxHp) * 100;

    const initialImg = `/poke/${encodeURIComponent(pokemon.speciesName)}.png`;
    const candidates = [
        initialImg,
        `/poke/${encodeURIComponent(pokemon.speciesName.toLowerCase())}.png`,
        '/poke/default.png',
    ];
    const [imgSrc, setImgSrc] = useState(initialImg);

    useEffect(() => {
        setImgSrc(initialImg);
    }, [initialImg]);

    return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
                relative w-64 bg-gray-900 border-2 rounded-xl p-4 shadow-2xl
                ${isActive ? (isOpponent ? 'border-red-500' : 'border-blue-500') : 'border-gray-700'}
                ${pokemon.stats.hp <= 0 ? 'opacity-50 grayscale' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white shadow-black drop-shadow-md">{pokemon.speciesName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 capitalize">{pokemon.types[0]}</span>
            </div>

            {/* Sprite Placeholder */}
            <div className="h-32 w-full bg-black/40 rounded-lg flex items-center justify-center mb-3 relative overflow-hidden group">
                {/* We can use CSS patterns or simple text specific colors based on type */}
                <div className={`
                    w-20 h-20 rounded-full blur-xl opacity-50 absolute
                    ${pokemon.types.includes('fire') ? 'bg-red-500' : ''}
                    ${pokemon.types.includes('water') ? 'bg-blue-500' : ''}
                    ${pokemon.types.includes('grass') ? 'bg-green-500' : ''}
                    ${pokemon.types.includes('electric') ? 'bg-yellow-500' : ''}
                    bg-gray-500
                `} />
                <img
                    src={imgSrc}
                    alt={pokemon.speciesName}
                    className="w-20 h-20 z-10 object-contain"
                    onError={() => {
                        const idx = candidates.indexOf(imgSrc);
                        const next = candidates[idx + 1] ?? '/poke/default.png';
                        if (next !== imgSrc) setImgSrc(next);
                    }}
                />
            </div>

            {/* HP Bar */}
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-1">
                <motion.div 
                    className={`h-full ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                    transition={{ type: 'spring' }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>HP</span>
                <span>{pokemon.stats.hp}/{pokemon.stats.maxHp}</span>
            </div>

            {/* Moves (Optional, maybe smaller) */}
            {isActive && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                    {pokemon.moves.map(m => (
                        <div key={m.name} className="bg-gray-800 text-[10px] p-1 rounded text-center text-gray-400">
                            {m.name}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export const BattleScene = ({ state }: { state: BattleState }) => {
    const { playerA, playerB, log } = state;
    
    // Safety check for empty teams
    if (!playerA.team.length || !playerB.team.length) return <div>Loading Teams...</div>;

    const activeA = playerA.team[playerA.activePokemonIndex];
    const activeB = playerB.team[playerB.activePokemonIndex];

    return (
        <div className="w-full h-full relative flex flex-col p-8 bg-[url('/grid-bg.png')]">
            
            {/* Top Bar: Turn and Info */}
            <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
                <div className="bg-gray-900/80 backdrop-blur px-6 py-2 rounded-full border border-gray-700">
                    <span className="text-gray-400 text-sm">Turn {state.turn} • {state.phase.toUpperCase()}</span>
                </div>
            </div>

            {/* Log Feed */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-96 h-24 pointer-events-none flex flex-col justify-end items-center space-y-1 z-20">
                <AnimatePresence>
                    {log.slice(-3).map((l, i) => (
                        <motion.div
                            key={state.turn + '-' + i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-black/60 text-white px-3 py-1 rounded text-sm shadow-lg backdrop-blur-sm text-center"
                        >
                            {l}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Battle Area */}
            <div className="flex-1 flex flex-col justify-between py-12 max-w-5xl mx-auto w-full">
                
                {/* Opponent (Agent Blue) */}
                <div className="flex justify-end px-12 items-center gap-8 translate-y-12">
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-1">
                            {playerB.team.slice(0, 3).map((p, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${p.stats.hp > 0 ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                            ))}
                        </div>
                        <h2 className="text-xl font-bold text-cyan-400">{playerB.name}</h2>
                    </div>
                    {activeB && <PokemonCard pokemon={activeB} isActive={true} isOpponent={true} />}
                </div>

                {/* Me (Agent Red) */}
                <div className="flex justify-start px-12 items-center gap-8 -translate-y-12">
                    {activeA && <PokemonCard pokemon={activeA} isActive={true} />}
                    <div className="flex flex-col items-start gap-2">
                         <h2 className="text-xl font-bold text-red-400">{playerA.name}</h2>
                         <div className="flex gap-1">
                            {playerA.team.slice(0, 3).map((p, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${p.stats.hp > 0 ? 'bg-red-500' : 'bg-gray-700'}`} />
                            ))}
                        </div>
                    </div>
                </div>

            </div>

             {/* Winner Overlay */}
             {state.winner && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border-2 border-yellow-500 p-8 rounded-2xl text-center"
                    >
                        <h2 className="text-4xl font-bold text-yellow-500 mb-2">Victory!</h2>
                        <p className="text-xl text-white">
                            {state.winner === 'playerA' ? playerA.name : playerB.name} wins!
                        </p>
                        <p className="text-sm text-gray-500 mt-4">New battle starting soon...</p>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
