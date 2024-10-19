#!/usr/bin/env node
const axios = require('axios');
const inquirer = require('inquirer');

// Fonction pour obtenir les données d'un Pokémon à partir de l'API
async function getPokemonData(pokemonName) {
  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données du Pokémon.');
    return null;
  }
}

// Fonction pour obtenir les données d'une attaque
async function getMoveData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données du move.');
    return null;
  }
}

// Classe représentant un joueur 
class Player {
  constructor(pokemonData) {
    this.name = pokemonData.name;
    this.hp = 300;
    this.moves = [];
    this.setMoves(pokemonData.moves);
  }

  // Récupérer les 5 premières attaques disponibles
  async setMoves(availableMoves) {
    const movePromises = availableMoves.slice(0, 5).map(async (move) => {
      const moveData = await getMoveData(move.move.url);
      return {
        name: moveData.name,
        power: moveData.power || 0,
        accuracy: moveData.accuracy || 100,
        pp: moveData.pp || 0,
      };
    });
    this.moves = await Promise.all(movePromises);
    this.moves = this.moves.filter((move) => move.name && move.power);
  }

  // Réaliser une attaque
  performMove(moveIndex, opponent) {
    const move = this.moves[moveIndex];

    if (!move) {
      console.log(`${this.name} n'a pas pu utiliser l'attaque.`);
      return false;
    }

    if (move.pp <= 0) {
      console.log(`${this.name} a essayé d'utiliser ${move.name}, mais il n'a plus de PP.`);
      return false;
    }

    move.pp--;

    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      console.log(`${this.name} rate son attaque ${move.name}.`);
      return false;
    }

    opponent.hp -= move.power;
    if (opponent.hp < 0) opponent.hp = 0;
    console.log(`${this.name} utilise ${move.name} et inflige ${move.power} dégâts à ${opponent.name}.`);

    return true;
  }

  // Vérifier si le joueur est encore en vie
  isAlive() {
    return this.hp > 0;
  }
}

// Tour du bot : choisir un mouvement aléatoire
function botChooseMove(player) {
  const moveIndex = Math.floor(Math.random() * player.moves.length);
  return moveIndex;
}

// Boucle de jeu
async function playGame(playerPokemonName) {
  const playerPokemonData = await getPokemonData(playerPokemonName);
  const botPokemonData = await getPokemonData('pikachu'); // Tu peux rendre le choix aléatoire

  if (!playerPokemonData || !botPokemonData) {
    console.log("Erreur lors de la récupération des données des Pokémon.");
    return;
  }

  const player = new Player(playerPokemonData);
  const bot = new Player(botPokemonData);

  console.log(`Un ${bot.name} sauvage apparaît !`);
  console.log(`${player.name}, je te choisis !\n`);

  await Promise.all([player.setMoves(playerPokemonData.moves), bot.setMoves(botPokemonData.moves)]);

  while (player.isAlive() && bot.isAlive()) {
    const choices = player.moves.map((move, index) => ({
      name: `${move.name} (PP: ${move.pp}, Power: ${move.power}, Accuracy: ${move.accuracy})`,
      value: index,
    }));

    const { playerMoveIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'playerMoveIndex',
        message: 'Choisissez une attaque :',
        choices,
      },
    ]);

    player.performMove(playerMoveIndex, bot);

    if (!bot.isAlive()) {
      console.log(`\n${bot.name} est K.O. Vous avez gagné !`);
      break;
    }

    const botMoveIndex = botChooseMove(bot);
    bot.performMove(botMoveIndex, player);

    if (!player.isAlive()) {
      console.log(`\n${player.name} est K.O. Vous avez perdu.`);
      break;
    }

    console.log(`\n${player.name} : ${player.hp} HP restants.`);
    console.log(`${bot.name} : ${bot.hp} HP restants.\n`);
  }
}

// Démarrer le jeu
async function startGame() {
  const { playerPokemonName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'playerPokemonName',
      message: 'Choisissez votre Pokémon : ',
    },
  ]);

  await playGame(playerPokemonName);
}

startGame();
