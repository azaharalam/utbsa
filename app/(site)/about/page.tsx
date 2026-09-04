export const metadata = { title: 'About' };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">About UTBSA</h1>
      <p className="mb-8 text-lg text-ink-mid">
        The Bangladeshi student and family community at the University of Toledo.
      </p>

      <div className="space-y-4 text-[15px] leading-relaxed">
        <p>
          UTBSA exists so that nobody arrives in Toledo alone. We meet people at the airport,
          find them a couch for the first week, explain how the bus system works, and then feed
          them for as long as they stay.
        </p>

        <h2 className="pt-4 font-display text-2xl font-bold">What we do</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-mid">
          <li><span className="text-ink">Cultural programmes.</span> Pohela Boishakh, Victory Day, International Mother Language Day, Iftar during Ramadan.</li>
          <li><span className="text-ink">Orientation.</span> A session each fall covering banking, phones, groceries, buses, and winter.</li>
          <li><span className="text-ink">Picnics and potlucks.</span> Usually at Wildwood, usually too much food.</li>
          <li><span className="text-ink">Sporting events.</span> Cricket and football, occasionally competitive.</li>
        </ul>

        <h2 className="pt-4 font-display text-2xl font-bold">How it is funded</h2>
        <p className="text-ink-mid">
          Members pay dues each spring and fall. That covers food and venue costs. The rest comes
          from ticketed sporting events and donations. The treasurer publishes a summary at the
          end of each term.
        </p>

        <h2 className="pt-4 font-display text-2xl font-bold">Who can join</h2>
        <p className="text-ink-mid">
          Any University of Toledo student, spouse, faculty member, or alum, and anyone in the
          Toledo area with an interest in Bangladeshi culture. You do not have to be Bangladeshi
          and you do not have to speak Bangla.
        </p>
      </div>
    </div>
  );
}
