import type { Story } from './types';

// THE ASKONE TABOO. A side adventure. A Trader is held on Askone for selling
// an atomic device. Get him out.

const TAREN = 'TAREN';
const ILEN = 'ILEN SARVO';
const CORIN = 'CORIN PELLIS';
const COMMS = 'COMMS';
const GOROV = 'RAL GOROV';
const PHERL = 'ELDER PHERL';

export const ASKONE_TABOO: Story = {
  id: 'askone-taboo',
  title: 'The Askone Taboo',
  subtitle: 'A side adventure',
  contract: {
    world: 'askone',
    summary: 'A Foundation Trader, Ral Gorov, is held on Askone for selling an atomic device. The taboo carries the gas chamber. Ponyets House will pay to have him back.',
    reward: '500 credits and the thanks of Ponyets House',
  },
  startWorld: 'askone',
  baseYear: 210,
  startCredits: 0,
  unlocked: ['askone'],
  scenes: [
    {
      id: 'askone-arrive',
      trigger: { type: 'arrive', world: 'askone' },
      steps: [
        { chapter: 'The Askone Taboo', sub: 'Askone' },
        { say: 'Askone. A world of ancestors and taboos, where the dead rule the living and an atomic device is a sin. A century ago a Trader named Ponyets bought a man out of here with a machine that made gold. The Askonians have not forgotten. They have not forgiven either.' },
        { say: 'Trader vessel. This is the Port of the Grand Master. You will land where you are told and you will carry nothing that is forbidden. Your countryman awaits the judgement of the Elders. You may see him once.', who: COMMS },
        { say: 'Once. That is generous, for Askone. Last time they let a Trader see the condemned man, the Trader walked out with him and the Elder who let it happen walked into the chamber instead.', who: CORIN },
        { objective: 'Enter orbit over Askone. You may see the prisoner once.' },
      ],
    },
    {
      id: 'askone-orbit',
      trigger: { type: 'orbit', world: 'askone' },
      steps: [
        { say: 'They let you down into a hall of dark wood and lamps where the Elders hear petitions. Ral Gorov sits at a table under guard, thinner than his file, with the look of a man who has read the file too.' },
        { enter: 'cantina', label: 'the Hall of Petitions on Askone', cast: ['ILEN SARVO', 'CORIN PELLIS'], extra: [
          { name: 'RAL GOROV', pos: [-4.75, 0.12, 3.0], yaw: 1.0, seated: true },
          { name: 'ELDER PHERL', pos: [-2.8, 0, -1.6], yaw: 2.8, seated: false },
        ] },
        { say: 'Ponyets House. Of course. The House would send a pilot and an Encyclopedist to a world that gases Traders. Sit, if they let you. They let me sit. They are very polite here, right up to the end.', who: GOROV },
        { say: 'What did you sell?', who: ILEN },
        { say: 'A heater. A kitchen heater. Atomic, yes, the size of a fist. A farmer wanted it for his hothouse. Half the Elders have one under the floor. The Elder who caught me has two. That is not the point. The point is the taboo, and the taboo is the point of Askone.', who: GOROV },
        { say: 'An old man in a grey robe comes down the hall with two guards, walking the way a man walks who has owned the floor his whole life. Elder Pherl. The name is in the file too. It was in Ponyets\' file, a century ago, on a younger man.' },
        { say: 'The Trader has been seen. The visit is concluded. The Elders will hear the case at sunrise and the case has been heard already, as is proper. You will leave by the morning tide.', who: PHERL },
        { say: 'You open the sense. Greed, mostly, worn into the shape of a man. And fear of the other Elders. And something else, small and hot: a hothouse under a floor, and a heater in it, and the shame of the heater.', who: TAREN },
        { choice: [
          { text: 'Tell him, quietly, that you know about the heater under his floor.', set: ['askone-leverage'] },
          { text: 'Reach into him. Make the taboo feel satisfied already.', set: ['askone-nudge'], strain: 1 },
          { text: 'Let Ilen offer the Encyclopedia\'s record of the Ponyets case, with Pherl\'s grandfather in it.', set: ['askone-record'] },
        ] },
        { if: ['askone-leverage'], then: [
          { say: 'You say it so that only he can hear. The hothouse. The heater. Two of them, in fact. He does not change his face. He changes his colour.' },
          { say: 'The case will be heard at sunrise. I find, on reflection, that the device was a heater and not a weapon, and that the taboo concerns weapons. The Trader is fined the value of the device and expelled. With you. Now.', who: PHERL },
          { journal: 'Askone. I told Elder Pherl I knew about the heater under his floor. Gorov was fined and expelled, with us, before the tide.' },
        ] },
        { if: ['askone-nudge'], then: [
          { say: 'You find the place where the taboo lives in him, which is not belief but habit, and you put a feeling of having already punished someone into it. He looks at Gorov, puzzled, as at a man he has met before.', who: TAREN },
          { say: 'The case... has been heard. Yes. Expelled. The Trader is expelled. Take him. I have other petitions.', who: PHERL },
          { say: 'Gorov looks at you across the table, and then at Pherl, and decides very quickly not to understand what he has seen.' },
          { journal: 'Askone. I made Elder Pherl believe the case was already heard. Gorov saw something. He has decided not to have seen it.' },
        ] },
        { if: ['askone-record'], then: [
          { say: 'Ilen lays a copy on the table. The Encyclopedia\'s entry on the Ponyets affair, with a name in it that is also on the Elder\'s robe. She reads it aloud, in the voice for footnotes, to the whole hall.' },
          { say: 'The guards hear it. The petitioners hear it. Pherl hears it with a face like a closed door.' },
          { say: 'The Encyclopedia is a tribal document and has no standing here. The case, however, is weak. Expelled. Take him and go, and take that document with you.', who: PHERL },
          { journal: 'Askone. Ilen read the Ponyets entry to the hall, with Pherl\'s grandfather named in it. Gorov was expelled. Pherl will not forget her.' },
        ] },
        { say: 'Gorov walks out between you with the gait of a man who expects to be called back and is not.' },
        { say: 'Ponyets House pays five hundred for this. I would have paid more. I will tell them that, and they will not raise it. Thank you, pilot. Whatever you did.', who: GOROV },
        { credits: 500 },
        { say: 'Ponyets House pays. Corin counts it twice.', who: CORIN },
        { enter: 'space' },
        { complete: 'askone-taboo' },
        { objective: '' },
        { end: 'The Askone Taboo is complete. Ral Gorov is free and Ponyets House has paid.' },
      ],
    },
  ],
};
