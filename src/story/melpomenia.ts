import type { Story } from './types';

// THE ENCYCLOPEDIA ERRAND. A side adventure. The Board wants a scan of the
// roll of the fifty Spacer worlds, in a dead hall on dead Melpomenia.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const HEKT = 'MIRA HEKT';

export const ENCYCLOPEDIA_ERRAND: Story = {
  id: 'encyclopedia-errand',
  title: 'The Encyclopedia Errand',
  subtitle: 'A side adventure',
  contract: {
    world: 'melpomenia',
    summary: 'The Encyclopedia Board wants a full scan of the Melpomenia roll, the stone list of the fifty Spacer worlds in a dead hall on a dead world. Ilen asked for this one herself.',
    reward: '400 credits from the Board, and a line in the Encyclopedia',
  },
  startWorld: 'melpomenia',
  baseYear: 210,
  startCredits: 0,
  unlocked: ['melpomenia'],
  scenes: [
    {
      id: 'melp-arrive',
      trigger: { type: 'arrive', world: 'melpomenia' },
      steps: [
        { chapter: 'The Encyclopedia Errand', sub: 'Melpomenia' },
        { say: 'Melpomenia. One of the fifty Spacer worlds, dead for twenty thousand years. The air is thin and the carbon dioxide in it will kill you in an hour, which is why nobody comes here, which is why a stone in a hall here still says what it said when the Spacers carved it.' },
        { say: 'The roll of the fifty worlds. Every Spacer world, with its distance from Earth. The Board has a copy of a copy of a sketch. I want the stone.', who: ILEN },
        { say: 'There is a ship down there already. Comporellon registry, salvage class. Salvagers do not come to dead worlds for the view.', who: CORIN },
        { objective: 'Enter orbit over Melpomenia. Masks on. Find the hall of the fifty worlds.' },
      ],
    },
    {
      id: 'melp-orbit',
      trigger: { type: 'orbit', world: 'melpomenia' },
      steps: [
        { say: 'You go down in masks, through a city that is all roofs fallen in and grey moss on everything, to a hall whose doors are long gone and whose stone is not.' },
        { enter: 'ruins', label: 'the Hall of the Fifty Worlds on Melpomenia', cast: ['ILEN SARVO', 'CORIN PELLIS', 'WRECK'], extra: [
          { name: 'MIRA HEKT', pos: [3.0, 0, -4.0], yaw: 2.8, seated: false },
        ] },
        { say: 'The roll is on the far wall, fifty names in a script Ilen can read and you cannot, and a robot lies in front of it with its chest open, the way they have been finding them on every dead world since Aurora. Beside the robot, in a salvage suit with the Comporellon crest, a woman is cutting the stone.' },
        { say: 'Mira Hekt. Hekt Salvage, out of Comporellon. This is my claim, I filed it, and the filing office on Comporellon is three hundred parsecs away, so the claim is this cutter. The stone is spoken for. A collector on Comporellon pays by the name. I have forty-nine names. I am cutting the fiftieth.', who: HEKT },
        { say: 'Which one?', who: ILEN },
        { say: 'The one somebody already cut out, a long time ago. See? There is a hole where a name was. The collector pays double for the hole. He says a hole with a story in it is worth more than a name.', who: HEKT },
        { say: 'You look at the hole. It is old. The chisel marks are older than the moss. Somebody came to a dead world, to a hall nobody would ever read, and took one name off the roll of the fifty, and went away again. You know whose name it was. It is the only name anyone has ever bothered to take away.', who: TAREN },
        { say: 'Earth. It would have been Earth. The distance would have been zero.', who: ILEN },
        { say: 'Can we have the hole, Hekt? Name a price. We are a trading House. We like prices.', who: CORIN },
        { choice: [
          { text: 'Buy the slab with the hole in it. Three hundred, in Foundation credits.', credits: -300, set: ['melp-buy'] },
          { text: 'Offer Hekt the Kestrel\'s spare drive coils. Salvage wants parts more than money.', set: ['melp-trade'] },
          { text: 'Reach into her. Make the hole worthless to her.', set: ['melp-nudge'], strain: 1 },
        ] },
        { if: ['melp-buy'], then: [
          { say: 'Three hundred Foundation. That is more than the collector, and the collector is three hundred parsecs away and you are here. Sold. I will even cut it clean.', who: HEKT },
          { say: 'She cuts it clean. Ilen scans the roll first, every name, twice, with Hekt holding the lamp and not charging for it.' },
          { journal: 'Melpomenia. I bought the slab with the hole in it from Mira Hekt for three hundred credits. Ilen scanned the roll of the fifty. The hole was Earth.' },
        ] },
        { if: ['melp-trade'], then: [
          { say: 'Two drive coils, Kestrel pattern, new. You know what those are worth on Comporellon. We know what they are worth. Nobody has to say it.', who: CORIN },
          { say: 'Coils. For a stone with a hole in it. You people are either very stupid or you know something, and I have been in salvage long enough to know which one pays. Take the hole. Take the robot too, it is no good to me. The chest is empty.', who: HEKT },
          { journal: 'Melpomenia. Corin traded two drive coils for the slab with the hole in it. Hekt said the robot\'s chest was empty. Ilen scanned the roll of the fifty. The hole was Earth.' },
        ] },
        { if: ['melp-nudge'], then: [
          { say: 'You find the collector in her, and the price, and the hole, and you make the hole small, and cheap, and a little embarrassing to have mentioned. It takes a moment. The moss on the wall is very green.', who: TAREN },
          { say: 'Take it. A hole. What was I thinking. Forty-nine names is a roll. A hole is a hole. Take it and get off my claim.', who: HEKT },
          { say: 'Ilen scans the roll with her back to you. She has worked out, by now, what it means when things become cheap.' },
          { journal: 'Melpomenia. I made Mira Hekt think the hole was worthless. Ilen scanned the roll with her back to me. The hole was Earth.' },
        ] },
        { say: 'Before you go, you stand over the robot for a moment. Its chest is open and empty, and somebody has taken, very carefully, with the right tools, whatever was in it. Not a salvager. Salvagers do not use the right tools.' },
        { say: 'Somebody has been to every dead world before you. Taking names. Taking memories. Being careful.', who: TAREN },
        { say: 'The Board gets a scan. The Encyclopedia gets fifty names and one hole. I will write the hole up myself, in the voice for footnotes. The Board will not read it. Somebody will.', who: ILEN },
        { credits: 400 },
        { say: 'Four hundred from the Board. The Board pays like a Board.', who: CORIN },
        { enter: 'space' },
        { complete: 'encyclopedia-errand' },
        { objective: '' },
        { end: 'The Encyclopedia Errand is complete. The roll of the fifty worlds is in the Encyclopedia, hole and all.' },
      ],
    },
  ],
};
