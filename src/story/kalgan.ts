import type { Story } from './types';

// THE KALGAN WAGER. A side adventure. Ponyets House's factor on Kalgan has
// wagered the House courier at the Warlord's tables and lost it. Get it back.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';
const TARRANT = 'NESSA TARRANT';
const VELLORY = 'DOM VELLORY';

export const KALGAN_WAGER: Story = {
  id: 'kalgan-wager',
  title: 'The Kalgan Wager',
  subtitle: 'A side adventure',
  contract: {
    world: 'kalgan',
    summary: 'Ponyets House\'s factor on Kalgan, Nessa Tarrant, wagered the House courier Linnet at the Warlord\'s tables and lost her. The House wants the ship back before the Palace lifts her.',
    reward: '700 credits and a quiet word in your favour at Ponyets House',
  },
  startWorld: 'kalgan',
  baseYear: 210,
  startCredits: 0,
  unlocked: ['kalgan'],
  scenes: [
    {
      id: 'kalgan-arrive',
      trigger: { type: 'arrive', world: 'kalgan' },
      steps: [
        { chapter: 'The Kalgan Wager', sub: 'Kalgan' },
        { say: 'Kalgan. The pleasure world. Three billion people and every one of them selling something. The Empire kept it as a place for the rich to lose their money gracefully, and when the Empire let go, a Warlord picked it up and kept the tables open. The tables are the point of Kalgan. The Warlord is only the house.' },
        { say: 'Trader vessel, Kalgan Approach. Welcome to the pleasure world. Landing fee, berth fee and hospitality fee are payable on the apron. The Palace advises that the courier Linnet, berth forty, is now Palace property, and that her former crew are the Palace\'s guests.', who: COMMS },
        { say: 'Guests. On Kalgan a guest is someone who has not paid yet. I have seen the Linnet. Fast, pretty, worth about nine of us. Tarrant did not lose that at cards. Nobody loses that at cards.', who: CORIN },
        { say: 'Then somebody took it from her at cards. That is a different thing, and it has a name, and the Warlord hangs people for it. Honest tables are the one law Kalgan has.', who: ILEN },
        { objective: 'Enter orbit over Kalgan. Find the factor, Nessa Tarrant, in the Palace.' },
      ],
    },
    {
      id: 'kalgan-orbit',
      trigger: { type: 'orbit', world: 'kalgan' },
      steps: [
        { say: 'The Palace sends a car. It does not ask who you are. The car climbs through a city that is all lights and no windows and sets you down at a door with no handle, which opens.' },
        { enter: 'salon' },
        { say: 'Red walls, gold, a ceiling of light. Nine tables and the quiet of a great deal of money changing hands politely. A woman in Ponyets colours stands by the long table with her hands behind her back, like a factor who has been told to wait.' },
        { say: 'Pilot. Encyclopedist. They sent an Encyclopedist. I suppose the House wanted a witness. I am Nessa Tarrant. I was the House\'s factor on Kalgan, and I wagered the Linnet at that table on a hand that could not lose. Sevens, high suit, under the lamp. It lost.', who: TARRANT },
        { say: 'Who held the bank?', who: CORIN },
        { say: 'The house. Dom Vellory, master of tables, the Warlord\'s own. He did not touch the cards. He never touches the cards. He sat there, and he smiled, and the dealer turned a hand that was not possible, and I signed.', who: TARRANT },
        { say: 'On a dais under a gold grille a man in a black coat sits with his hands folded, watching the room the way the room watches the cards. Dom Vellory. He has already seen you. He saw you when the door opened.' },
        { say: 'Ponyets House. Twice in a month. Your factor was a guest at my table and lost like a gentleman, which on Kalgan is the only way to lose. The Linnet is the Palace\'s. Her crew eat at the Warlord\'s expense until the House settles their keep. You are welcome to play. Everyone is welcome to play.', who: VELLORY },
        { say: 'You open the sense, carefully, in a room full of minds that are all thinking about money. The dealer at the long table is not thinking about money. He is listening. Four seats down, a thin man with a glass he has not touched is looking at the players\' hands and thinking about them very clearly, one at a time, like a man reading aloud.', who: TAREN },
        { say: 'That is how the table cannot lose. Not the cards. A reader, and a dealer with a good ear for what the reader thinks. Vellory knows. It is the one thing in the room he is proud of.', who: TAREN },
        { say: 'You have that face, pilot. The one you get before something happens to someone.', who: CORIN },
        { choice: [
          { text: 'Sit at the long table and play for the Linnet. You can hear the dealer too.', set: ['kalgan-play'] },
          { text: 'Tell Corin where to look. Let her show the room how the thin man reads hands.', set: ['kalgan-expose'] },
          { text: 'Reach into Vellory. Let him feel the debt is settled and the House is dangerous.', set: ['kalgan-nudge'], strain: 1 },
        ] },
        { if: ['kalgan-play'], then: [
          { say: 'You sit. The dealer deals. The thin man reads your hand and finds nothing in it, because there is nothing in you to read, and his face does a small thing it has not done in years. The dealer hears nothing. You hear the dealer.' },
          { say: 'Four hands. You lose the first, on purpose, for the look of it. You win the next three, the last for the Linnet and her crew\'s keep, on a hand that is exactly as possible as Tarrant\'s was not.' },
          { say: 'Remarkable. The Linnet is yours, pilot, and the berth fee is waived, and I would take it as a courtesy if Ponyets House sent a different pilot next time. Kalgan remembers faces. Mine is a very good memory.', who: VELLORY },
          { journal: 'Kalgan. I played Vellory\'s table and heard the dealer as he heard the reader. The Linnet is ours again. Vellory remembers my face.' },
        ] },
        { if: ['kalgan-expose'], then: [
          { say: 'You tell Corin where to look. It takes her one hand to see it. She has worked tables on three worlds, and she takes the empty seat beside the thin man, lays her cards face down, and talks to him pleasantly about nothing until he looks at them from habit. Then she names them aloud, to the room, before the dealer turns them.' },
          { say: 'She does it twice more. By the third time the room is very quiet, and the players are looking at Dom Vellory, and Dom Vellory is looking at the thin man as at a piece of furniture that has broken.' },
          { say: 'This man is not of the house. The house did not know him. The house regrets. Every wager at this table since the first bell is void, the Linnet is returned to her owners with the Palace\'s apology, and this man will explain himself to the Warlord, who takes a personal interest in honest tables.', who: VELLORY },
          { say: 'The thin man goes out between two large people and does not come back. Tarrant watches him go with no expression at all.' },
          { journal: 'Kalgan. Corin showed the room the man who read hands for Vellory\'s dealer. Vellory voided the wagers and gave him to the Warlord. The Linnet is ours again. Vellory knew, and lost nothing.' },
        ] },
        { if: ['kalgan-nudge'], then: [
          { say: 'You find the place in Vellory where the Linnet sits, which is pride, and the place beside it where Ponyets House sits, which is nothing much. You make the House a little heavier and the ship a little lighter. It takes a moment. It costs you something.', who: TAREN },
          { say: 'The Linnet. Yes. On reflection the House is an old customer and a courier is a small thing between friends. Take her. Take the crew. The Palace keeps the wager and forgives the ship. Tell your House we are generous.', who: VELLORY },
          { say: 'Ilen does not look at you. She looks at Vellory, who is smiling at a thing he has decided to think, and then she looks at the floor.' },
          { say: 'That was quick.', who: ILEN },
          { journal: 'Kalgan. I made Vellory want to give the Linnet back. Ilen saw it. She said: that was quick.' },
        ] },
        { say: 'As you turn to go you feel it. One mind in the room was not thinking about money, or cards, or you. It was watching what you did the way a man watches weather, with interest and no surprise. You reach for it. It closes, like a hand, and when you look there is only a table and an empty glass.', who: TAREN },
        { say: 'Nobody in the room saw anyone leave.' },
        { set: ['kalgan-watched'] },
        { journal: 'Kalgan. Somebody in the Salon watched me work, and knew what they were watching, and closed their mind when I reached. I do not know who. I do not think it was the first time.' },
        { say: 'The House will recall me. It should. Seven hundred, pilot, from the factor\'s own account, and it was never the ship I minded losing. It was losing to a man who did not touch the cards.', who: TARRANT },
        { credits: 700 },
        { say: 'Seven hundred, and the Linnet\'s crew eat on us tonight. Fair.', who: CORIN },
        { enter: 'space' },
        { complete: 'kalgan-wager' },
        { objective: '' },
        { end: 'The Kalgan Wager is complete. The Linnet is returned to Ponyets House.' },
      ],
    },
  ],
};
