import { Link } from 'react-router-dom';
import { EvervaultCard } from '../components/EvervaultCard';

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  image?: string;
  path: string;
  status: 'live' | 'coming-soon';
}

function LandingPage() {
  const games: GameCard[] = [
    {
      id: '1',
      title: 'Pokemon Open World',
      description: 'Explore infinite procedurally generated islands with unique terrain and biomes!',
      icon: '🌍',
      image: '/pokemon.png',
      path: '/pokemon-world',
      status: 'live'
    },
    {
      id: '2',
      title: 'Tap Trading',
      description: 'Predict market moves and win big in this fast-paced trading game!',
      icon: '📈',
      image: '/trending.png',
      path: '/tap-trading',
      status: 'live'
    },
    {
      id: '3',
      title: 'Battle Arena',
      description: 'Challenge other players in real-time PvP battles!',
      icon: '⚔️',
      path: '#',
      status: 'coming-soon'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center pt-32 pb-20 px-8">
      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {games.map((game) => (
            <div key={game.id} className="relative">
              <Link to={game.status === 'live' ? game.path : '#'} className={`block h-full group ${game.status === 'coming-soon' ? 'cursor-not-allowed opacity-80' : ''}`}>
                <div className="relative h-[28rem] w-full">
                  <EvervaultCard text={game.icon} image={game.image}>
                    <div className="w-full p-10 pt-12 shrink-0 bg-black/80 border-t border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/90 z-20">
                      <h3 className="text-xl font-bold text-white mb-2 font-space uppercase tracking-wide">{game.title}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{game.description}</p>
                      <div className="flex items-center justify-between">
                        {game.status === 'coming-soon' && (
                          <span className="inline-block px-6 py-3 bg-gray-800/50 border border-gray-700 text-gray-400 rounded-none text-sm font-mono uppercase tracking-wider">
                            Coming Soon
                          </span>
                        )}
                        {game.status === 'live' && (
                          <span className="inline-block px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-none text-sm font-mono uppercase tracking-wider group-hover:bg-green-500 group-hover:text-black transition-colors">
                            Play Now
                          </span>
                        )}
                      </div>
                    </div>
                  </EvervaultCard>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
