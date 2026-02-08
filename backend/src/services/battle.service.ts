
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './ai.service';
import { BettingService } from './betting.service';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface BattleMove {
    name: string;
    power: number;
    accuracy: number;
    type: string;
    category: 'physical' | 'special';
    priority?: number;
    cooldown: number;
}

export interface BattleAbility {
    name: string;
    effect: string;
    value: number;
}

export interface BattlePokemon {
    id: string; // Runtime instance ID
    speciesName: string;
    types: string[];
    stats: {
        hp: number;
        maxHp: number;
        attack: number;
        defense: number;
        spAttack: number;
        spDefense: number;
        speed: number;
    };
    moves: BattleMove[];
    ability: BattleAbility;
    status?: string;
    modifiers: {
        attack: number;
        defense: number;
        speed: number;
        accuracy: number;
    };
    cooldowns: Record<string, number>; // moveName -> turns remaining
}

export interface BattlePlayer {
    id: string; // 'playerA' | 'playerB'
    name: string;
    team: BattlePokemon[];
    activePokemonIndex: number;
    faintedCount: number;
}

export interface BattleState {
    id: string;
    turn: number;
    playerA: BattlePlayer;
    playerB: BattlePlayer;
    log: string[];
    winner?: string; // 'playerA' | 'playerB' | null
    phase: 'waiting' | 'action' | 'finished';
}

// ==========================================
// STATIC DATA LIBRARY
// ==========================================

const MOVES_LIBRARY: BattleMove[] = [
    { name: 'Flamethrower', power: 90, accuracy: 0.95, type: 'fire', category: 'special', cooldown: 1 },
    { name: 'Fire Blast', power: 110, accuracy: 0.8, type: 'fire', category: 'special', cooldown: 3 },
    { name: 'Flame Wheel', power: 70, accuracy: 1.0, type: 'fire', category: 'physical', cooldown: 0 },
    { name: 'Surf', power: 90, accuracy: 0.95, type: 'water', category: 'special', cooldown: 1 },
    { name: 'Hydro Pump', power: 110, accuracy: 0.8, type: 'water', category: 'special', cooldown: 3 },
    { name: 'Aqua Tail', power: 85, accuracy: 0.9, type: 'water', category: 'physical', cooldown: 1 },
    { name: 'Razor Leaf', power: 75, accuracy: 0.95, type: 'grass', category: 'physical', cooldown: 0 },
    { name: 'Solar Beam', power: 110, accuracy: 0.85, type: 'grass', category: 'special', cooldown: 3 },
    { name: 'Energy Ball', power: 90, accuracy: 0.95, type: 'grass', category: 'special', cooldown: 1 },
    { name: 'Thunderbolt', power: 90, accuracy: 0.95, type: 'electric', category: 'special', cooldown: 1 },
    { name: 'Thunder', power: 110, accuracy: 0.8, type: 'electric', category: 'special', cooldown: 3 },
    { name: 'Spark', power: 70, accuracy: 1.0, type: 'electric', category: 'physical', cooldown: 0 },
    { name: 'Psychic', power: 90, accuracy: 0.95, type: 'psychic', category: 'special', cooldown: 1 },
    { name: 'Shadow Ball', power: 85, accuracy: 0.95, type: 'ghost', category: 'special', cooldown: 1 },
    { name: 'Earthquake', power: 100, accuracy: 0.9, type: 'ground', category: 'physical', cooldown: 2 },
    { name: 'Rock Slide', power: 85, accuracy: 0.9, type: 'rock', category: 'physical', cooldown: 1 },
    { name: 'Close Combat', power: 100, accuracy: 0.9, type: 'fighting', category: 'physical', cooldown: 2 },
    { name: 'Ice Beam', power: 90, accuracy: 0.95, type: 'ice', category: 'special', cooldown: 1 },
    { name: 'Dragon Claw', power: 85, accuracy: 0.95, type: 'dragon', category: 'physical', cooldown: 1 },
    { name: 'Crunch', power: 80, accuracy: 0.95, type: 'dark', category: 'physical', cooldown: 0 },
    { name: 'Slash', power: 70, accuracy: 1.0, type: 'normal', category: 'physical', cooldown: 0 },
    { name: 'Quick Attack', power: 40, accuracy: 1.0, type: 'normal', category: 'physical', priority: 1, cooldown: 0 },
    { name: 'Tackle', power: 50, accuracy: 1.0, type: 'normal', category: 'physical', cooldown: 0 },
    { name: 'Hyper Beam', power: 120, accuracy: 0.75, type: 'normal', category: 'special', cooldown: 4 },
    { name: 'Air Slash', power: 75, accuracy: 0.95, type: 'flying', category: 'special', cooldown: 1 },
    { name: 'Bullet Punch', power: 40, accuracy: 1.0, type: 'steel', category: 'physical', priority: 1, cooldown: 0 },
    { name: 'Moonblast', power: 90, accuracy: 0.95, type: 'fairy', category: 'special', cooldown: 1 },
    { name: 'X-Scissor', power: 80, accuracy: 0.95, type: 'bug', category: 'physical', cooldown: 1 },
    { name: 'Body Slam', power: 85, accuracy: 1.0, type: 'normal', category: 'physical', cooldown: 1 }
];

const ABILITIES_LIBRARY: BattleAbility[] = [
    { name: 'Blaze', effect: 'power_boost_low_hp', value: 1.15 },
    { name: 'Torrent', effect: 'power_boost_low_hp', value: 1.15 },
    { name: 'Overgrow', effect: 'power_boost_low_hp', value: 1.15 },
    { name: 'Swift', effect: 'speed_flat', value: 15 },
    { name: 'Tanky', effect: 'hp_flat', value: 20 },
    { name: 'Thick Skin', effect: 'damage_reduction', value: 0.9 },
    { name: 'Sniper', effect: 'crit_boost', value: 0.15 },
    { name: 'Intimidate', effect: 'enemy_attack_down', value: 0.9 },
    { name: 'Moxie', effect: 'attack_on_ko', value: 1.1 },
    { name: 'Speed Boost', effect: 'speed_per_turn', value: 10 },
    { name: 'Sturdy', effect: 'survive_one_hit', value: 1 },
    { name: 'Adaptability', effect: 'all_power_boost', value: 1.1 }
];

const POKEMON_SPECIES_LIBRARY = [
    { name: 'Charizard', types: ['fire', 'flying'], ability: 'Blaze', moves: ['Flamethrower', 'Air Slash', 'Slash', 'Fire Blast'], baseStats: { hp: 78, attack: 84, defense: 78, spAttack: 109, spDefense: 85, speed: 100 } },
    { name: 'Blastoise', types: ['water'], ability: 'Tanky', moves: ['Surf', 'Ice Beam', 'Crunch', 'Hydro Pump'], baseStats: { hp: 79, attack: 83, defense: 100, spAttack: 85, spDefense: 105, speed: 78 } },
    { name: 'Venusaur', types: ['grass', 'poison'], ability: 'Overgrow', moves: ['Razor Leaf', 'Energy Ball', 'Tackle', 'Solar Beam'], baseStats: { hp: 80, attack: 82, defense: 83, spAttack: 100, spDefense: 100, speed: 80 } },
    { name: 'Pikachu', types: ['electric'], ability: 'Swift', moves: ['Thunderbolt', 'Quick Attack', 'Tackle', 'Thunder'], baseStats: { hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 } },
    { name: 'Gengar', types: ['ghost', 'poison'], ability: 'Sniper', moves: ['Shadow Ball', 'Psychic', 'Quick Attack', 'Slash'], baseStats: { hp: 60, attack: 65, defense: 60, spAttack: 130, spDefense: 75, speed: 110 } },
    { name: 'Dragonite', types: ['dragon', 'flying'], ability: 'Thick Skin', moves: ['Dragon Claw', 'Air Slash', 'Thunderbolt', 'Hyper Beam'], baseStats: { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 } },
    { name: 'Snorlax', types: ['normal'], ability: 'Tanky', moves: ['Body Slam', 'Crunch', 'Tackle', 'Hyper Beam'], baseStats: { hp: 160, attack: 110, defense: 65, spAttack: 65, spDefense: 110, speed: 30 } },
    { name: 'Lucario', types: ['fighting', 'steel'], ability: 'Adaptability', moves: ['Close Combat', 'Bullet Punch', 'Crunch', 'Quick Attack'], baseStats: { hp: 70, attack: 110, defense: 70, spAttack: 115, spDefense: 70, speed: 90 } },
    { name: 'Tyranitar', types: ['rock', 'dark'], ability: 'Thick Skin', moves: ['Rock Slide', 'Crunch', 'Earthquake', 'Hyper Beam'], baseStats: { hp: 100, attack: 134, defense: 110, spAttack: 95, spDefense: 100, speed: 61 } },
    { name: 'Gardevoir', types: ['psychic', 'fairy'], ability: 'Sniper', moves: ['Psychic', 'Moonblast', 'Shadow Ball', 'Energy Ball'], baseStats: { hp: 68, attack: 65, defense: 65, spAttack: 125, spDefense: 115, speed: 80 } }
];

const TYPE_CHART: Record<string, Record<string, number>> = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

// ==========================================
// HELPERS
// ==========================================

function getMove(name: string): BattleMove | undefined {
    return MOVES_LIBRARY.find(m => m.name === name);
}

function getAbility(name: string): BattleAbility | undefined {
    return ABILITIES_LIBRARY.find(a => a.name === name);
}

function generatePokemon(speciesName: string): BattlePokemon {
    const species = POKEMON_SPECIES_LIBRARY.find(s => s.name === speciesName);
    if (!species) throw new Error(`Species ${speciesName} not found`);

    const ability = getAbility(species.ability);
    if (!ability) throw new Error(`Ability ${species.ability} not found`);

    const moves = species.moves.map(m => getMove(m)).filter(m => m !== undefined) as BattleMove[];

    // Calculate actual stats (simplified formula: base * level_multiplier, assuming level 50ish equivalent)
    // For this auto-battler, we'll just use base stats * 2 + 10 for HP and base + 5 for others to simulate level 50
    const stats = {
        hp: species.baseStats.hp * 2 + 110,
        maxHp: species.baseStats.hp * 2 + 110,
        attack: species.baseStats.attack + 50,
        defense: species.baseStats.defense + 50,
        spAttack: species.baseStats.spAttack + 50,
        spDefense: species.baseStats.spDefense + 50,
        speed: species.baseStats.speed + 50
    };

    // Apply Ability Stat Mods on generation if they are flat/permanent
    if (ability.effect === 'hp_flat') {
        stats.hp += ability.value;
        stats.maxHp += ability.value;
    }
    if (ability.effect === 'speed_flat') {
        stats.speed += ability.value;
    }

    return {
        id: uuidv4(),
        speciesName: species.name,
        types: species.types,
        stats,
        moves,
        ability,
        modifiers: {
            attack: 1,
            defense: 1,
            speed: 1,
            accuracy: 1
        },
        cooldowns: {}
    };
}

function getTypeMultiplier(attackerType: string, defenderTypes: string[]): number {
    let multiplier = 1;
    for (const defType of defenderTypes) {
        if (TYPE_CHART[attackerType] && TYPE_CHART[attackerType][defType] !== undefined) {
            multiplier *= TYPE_CHART[attackerType][defType];
        }
    }
    return multiplier;
}

function calculateDamage(attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove): { damage: number, isCrit: boolean, effectiveness: number } {
    // 1. Stats
    let a = move.category === 'physical' ? attacker.stats.attack : attacker.stats.spAttack;
    let d = move.category === 'physical' ? defender.stats.defense : defender.stats.spDefense;

    // Apply modifiers
    a *= attacker.modifiers.attack;
    // d *= defender.modifiers.defense; // Defense modifiers usually applied elsewhere or ignored for crits, but keeping simple for now

    // Ability: All Power Boost
    if (attacker.ability.effect === 'all_power_boost') {
        a *= attacker.ability.value;
    }
    // Ability: Low HP Boost
    if (attacker.ability.effect === 'power_boost_low_hp' && attacker.stats.hp < attacker.stats.maxHp / 3) {
         if (attacker.types.includes(move.type)) { // Usually specific to type (Blaze/Torrent), assuming correct match for simplicity
             a *= attacker.ability.value;
         }
    }

    // 2. Base Damage Formula (Level 50 standard)
    // Damage = ((((2 * Level / 5 + 2) * AttackStat * AttackPower / DefenseStat) / 50) + 2) * Modifier
    // Level = 50 -> (22 * A * P / D) / 50 + 2
    let baseDamage = ((22 * a * move.power / d) / 50) + 2;

    // 3. Multipliers
    
    // Critical Hit
    let isCrit = Math.random() < 0.0625; // 1/16 default
    if (attacker.ability.effect === 'crit_boost') isCrit = Math.random() < attacker.ability.value;
    
    if (isCrit) baseDamage *= 1.5;

    // STAB
    if (attacker.types.includes(move.type)) {
        baseDamage *= 1.5;
    }

    // Type Effectiveness
    const effectiveness = getTypeMultiplier(move.type, defender.types);
    baseDamage *= effectiveness;

    // Random roll (0.85 to 1.00)
    baseDamage *= (Math.floor(Math.random() * 16) + 85) / 100;

    // Ability: Damage Reduction (Defender)
    if (defender.ability.effect === 'damage_reduction') {
        baseDamage *= defender.ability.value;
    }

    return {
        damage: Math.floor(baseDamage),
        isCrit,
        effectiveness
    };
}


// ... imports
import { Server } from 'bun';

// ... (previous interfaces)

// ==========================================
// BATTLE CLASS
// ==========================================

export class AutoBattlerByRoom {
    // Static map of roomName -> Battle Instance
    private static instances: Map<string, AutoBattlerByRoom> = new Map();
    private static server: Server<any> | null = null;

    public state: BattleState;
    private timer: Timer | null = null;

    private constructor(roomName: string) {
        const teamA = this.generateRandomTeam(3); // Team size 3
        const teamB = this.generateRandomTeam(3);

        this.state = {
            id: roomName,
            turn: 0,
            playerA: { id: 'playerA', name: 'Agent Red', team: teamA, activePokemonIndex: 0, faintedCount: 0 },
            playerB: { id: 'playerB', name: 'Agent Blue', team: teamB, activePokemonIndex: 0, faintedCount: 0 },
            log: ['Battle Started!'],
            phase: 'waiting'
        };
    }

    public static setServer(server: Server<any>) {
        this.server = server;
    }

    public static get(roomName: string): AutoBattlerByRoom | undefined {
        return this.instances.get(roomName);
    }

    public static getOrCreate(roomName: string): AutoBattlerByRoom {
        let instance = this.instances.get(roomName);
        if (!instance) {
            instance = new AutoBattlerByRoom(roomName);
            this.instances.set(roomName, instance);
            // Auto start for specific rooms or all? Let's auto-start for now when accessed/created
            instance.start();
        }
        return instance;
    }

    public start() {
        if (this.state.phase !== 'waiting') return;
        this.state.phase = 'action';
        this.broadcast(); // Initial state
        this.nextTurn();
    }
    
    public stop() {
        if (this.timer) clearTimeout(this.timer);
    }
    
    private generateRandomTeam(count: number): BattlePokemon[] {
        const team: BattlePokemon[] = [];
        for (let i = 0; i < count; i++) {
            const randomSpecies = POKEMON_SPECIES_LIBRARY[Math.floor(Math.random() * POKEMON_SPECIES_LIBRARY.length)];
            team.push(generatePokemon(randomSpecies.name));
        }
        return team;
    }

    private broadcast() {
        if (AutoBattlerByRoom.server) {
            AutoBattlerByRoom.server.publish(
                `room:${this.state.id}`, // Topic must match subscription in game.routes.ts
                JSON.stringify({
                    type: 'battle_update',
                    state: this.state
                })
            );
        }
    }

    // ... nextTurn etc


    private nextTurn() {
        if (this.state.winner) return;

        // Auto-battle loop delay (Make it readable for watchers)
        this.timer = setTimeout(() => {
            this.executeTurn();
        }, 12000); // 3 seconds per turn
    }

    private async executeTurn() {
        if (this.state.phase !== 'action') return;

        this.state.turn++;
        const p1 = this.state.playerA;
        const p2 = this.state.playerB;

        const active1 = p1.team[p1.activePokemonIndex];
        const active2 = p2.team[p2.activePokemonIndex];
        
        // Handle Fainted Pokemon Switch
        let switchLog: string[] = [];
        
        // Check if either side needs to switch before attack
        if (active1.stats.hp <= 0) {
            const nextIdx = p1.team.findIndex(p => p.stats.hp > 0);
            if (nextIdx === -1) {
                this.endBattle(p2.id);
                return;
            }
            p1.activePokemonIndex = nextIdx;
            switchLog.push(`${p1.name} sends out ${p1.team[nextIdx].speciesName}!`);
             // Reset cooldowns or buffs could happen here
             this.state.log.push(...switchLog);
             this.broadcast();
             this.nextTurn(); // Next turn immediately after switch
             return;
        }
        if (active2.stats.hp <= 0) {
             const nextIdx = p2.team.findIndex(p => p.stats.hp > 0);
             if (nextIdx === -1) {
                 this.endBattle(p1.id);
                 return;
             }
             p2.activePokemonIndex = nextIdx;
             switchLog.push(`${p2.name} sends out ${p2.team[nextIdx].speciesName}!`);
             this.state.log.push(...switchLog);
             this.broadcast();
             this.nextTurn();
             return;
        }

        // AI Logic: Ask Gemini for moves (Parallel for speed)
        let move1: BattleMove, move2: BattleMove;
        
        try {
            const [choice1, choice2] = await Promise.all([
                AIService.pickMove(active1, active2, this.state),
                AIService.pickMove(active2, active1, this.state)
            ]);
            move1 = this.resolveMove(active1, choice1);
            move2 = this.resolveMove(active2, choice2);
        } catch (e) {
            console.error("AI Service failure, falling back to random", e);
            move1 = this.pickMoveRandom(active1);
            move2 = this.pickMoveRandom(active2);
        }

        // Turn Order
        let first = active1;
        let second = active2;
        let firstMove = move1;
        let secondMove = move2;
        let firstPlayer = p1;
        let secondPlayer = p2;

        // Priority check
        if ((move2.priority || 0) > (move1.priority || 0)) {
            first = active2; second = active1;
            firstMove = move2; secondMove = move1;
            firstPlayer = p2; secondPlayer = p1;
        } else if ((move1.priority || 0) === (move2.priority || 0)) {
            if (active2.stats.speed > active1.stats.speed) {
                first = active2; second = active1;
                firstMove = move2; secondMove = move1;
                firstPlayer = p2; secondPlayer = p1;
            } else if (active2.stats.speed === active1.stats.speed && Math.random() > 0.5) {
                first = active2; second = active1;
                firstMove = move2; secondMove = move1;
                firstPlayer = p2; secondPlayer = p1;
            }
        }

        // Execution
        const turnLog: string[] = [`Turn ${this.state.turn}:`];

        // First Attacker
        const dead1 = this.performAttack(first, second, firstMove, turnLog);
        if (dead1) {
             this.state.log.push(...turnLog);
             this.checkFaint(secondPlayer, second);
             this.broadcast();
             this.nextTurn();
             return;
        }

        // Second Attacker
        const dead2 = this.performAttack(second, first, secondMove, turnLog);
        if (dead2) {
             this.state.log.push(...turnLog);
             this.checkFaint(firstPlayer, first);
             this.broadcast();
             this.nextTurn();
             return;
        }

        // Apply Cooldowns - decrement
        this.updateCooldowns(active1);
        this.updateCooldowns(active2);

        this.state.log.push(...turnLog);
        
        // Trim log
        if (this.state.log.length > 50) {
            this.state.log = this.state.log.slice(this.state.log.length - 50);
        }

        this.broadcast();
        this.nextTurn();
    }

    private resolveMove(pokemon: BattlePokemon, moveName: string): BattleMove {
        const move = pokemon.moves.find(m => m.name === moveName);
        if (move && (pokemon.cooldowns[move.name] || 0) === 0) return move;
        return this.pickMoveRandom(pokemon);
    }

    private pickMoveRandom(pokemon: BattlePokemon): BattleMove {
        const available = pokemon.moves.filter(m => (pokemon.cooldowns[m.name] || 0) === 0);
        if (available.length === 0) return { name: 'Struggle', power: 50, accuracy: 1.0, type: 'normal', category: 'physical', cooldown: 0 };
        return available[Math.floor(Math.random() * available.length)];
    }

    private performAttack(attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove, logs: string[]): boolean {
        // Hit check
        if (Math.random() > move.accuracy * attacker.modifiers.accuracy) {
            logs.push(`${attacker.speciesName} used ${move.name} but missed!`);
            return false; // Defender alive
        }

        // Calculate Damage
        const { damage, isCrit, effectiveness } = calculateDamage(attacker, defender, move);
        defender.stats.hp -= damage;
        if (defender.stats.hp < 0) defender.stats.hp = 0;

        // Apply Cooldown
        if (move.cooldown > 0) {
            attacker.cooldowns[move.name] = move.cooldown + 1; // +1 because it decrements at end of turn
        }

        let msg = `${attacker.speciesName} used ${move.name}!`;
        if (isCrit) msg += " Critical Hit!";
        if (effectiveness > 1) msg += " It's super effective!";
        else if (effectiveness < 1 && effectiveness > 0) msg += " It's not very effective...";
        else if (effectiveness === 0) msg += " It had no effect.";
        
        msg += ` (Dealt ${damage} dmg)`;
        logs.push(msg);

        return defender.stats.hp <= 0;
    }

    private updateCooldowns(pokemon: BattlePokemon) {
        for (const moveName in pokemon.cooldowns) {
            if (pokemon.cooldowns[moveName] > 0) pokemon.cooldowns[moveName]--;
        }
    }

    private checkFaint(player: BattlePlayer, pokemon: BattlePokemon) {
        if (pokemon.stats.hp <= 0) {
            pokemon.stats.hp = 0;
            player.faintedCount++;
            this.state.log.push(`${pokemon.speciesName} fainted!`);
        }
    }

    private async endBattle(winnerId: string) {
        this.state.winner = winnerId;
        this.state.phase = 'finished';
        this.state.log.push(`Battle Finished! ${winnerId === 'playerA' ? this.state.playerA.name : this.state.playerB.name} wins!`);
        this.broadcast();

        // Distribute Winnings
        try {
            await BettingService.distributeWinnings(this.state.id, winnerId as 'playerA' | 'playerB');
        } catch (e) {
            console.error("Payout error:", e);
        }

        // Restart after 1 minute (60 seconds)
        console.log(`Battle ${this.state.id} finished. Restarting in 60s...`);
        setTimeout(() => {
            this.resetBattle();
        }, 60000);
    }

    private resetBattle() {
        const teamA = this.generateRandomTeam(3);
        const teamB = this.generateRandomTeam(3);

        this.state = {
            id: this.state.id,
            turn: 0,
            playerA: { id: 'playerA', name: 'Agent Red', team: teamA, activePokemonIndex: 0, faintedCount: 0 },
            playerB: { id: 'playerB', name: 'Agent Blue', team: teamB, activePokemonIndex: 0, faintedCount: 0 },
            log: ['New Battle Starting!'],
            phase: 'waiting'
        };
        
        console.log(`Battle ${this.state.id} restarted.`);
        this.start();
    }
}
