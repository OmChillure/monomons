
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BattlePokemon, BattleState, BattleMove } from "./battle.service";

// Load available keys from environment
const apiKeys = [
    process.env.GEMINI_API_KEY_1, 
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY
].filter((key): key is string => !!key && key.length > 0);

let keyPointer = 0;

export class AIService {
    
    static async pickMove(
        attacker: BattlePokemon, 
        defender: BattlePokemon, 
        battleState: BattleState
    ): Promise<string> { // Returns move name
        
        if (apiKeys.length === 0) {
            console.warn("No GEMINI_API_KEYs (1 or 2) set, falling back to basic logic");
            return "random";
        }

        // Round-robin key selection
        const currentKey = apiKeys[keyPointer];
        keyPointer = (keyPointer + 1) % apiKeys.length;

        // Initialize Gemini with the selected key
        // We use gemini-1.5-flash as 2.5 is not a valid model ID yet
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        try {
            const availableMoves = attacker.moves.filter(m => (attacker.cooldowns[m.name] || 0) === 0);
            if (availableMoves.length === 0) return "Struggle";

            const prompt = `
            You are a Pokemon Battle AI. Pick the best move for ${attacker.speciesName} to defeat ${defender.speciesName}.
            
            Game State:
            - Attacker: ${attacker.speciesName} (${attacker.types.join('/')}) | HP: ${attacker.stats.hp}/${attacker.stats.maxHp} | Ability: ${attacker.ability.name}
            - Defender: ${defender.speciesName} (${defender.types.join('/')}) | HP: ${defender.stats.hp}/${defender.stats.maxHp}
            
            Available Moves:
            ${availableMoves.map(m => `- ${m.name} (Type: ${m.type}, Power: ${m.power}, Category: ${m.category})`).join('\n')}
            
            Rules:
            1. Consider Type Effectiveness (Water > Fire, etc).
            2. Consider STAB (Same Type Attack Bonus).
            3. If the enemy is low HP, use a sure-hit or priority move if available.
            
            Respond with ONLY the name of the move. Nothing else.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();

            console.log(`🤖 AI (${attacker.speciesName}) chose: ${text}`);

            // Validate if the chosen move is actually available
            const chosenMove = availableMoves.find(m => m.name.toLowerCase() === text.toLowerCase());
            
            if (chosenMove) {
                return chosenMove.name;
            } else {
                console.warn(`AI chose invalid/unavailable move: ${text}. Valid options: ${availableMoves.map(m => m.name).join(', ')}`);
                return "random";
            }

        } catch (error) {
            console.error("AI Generation Error:", error);
            return "random";
        }
    }
}
