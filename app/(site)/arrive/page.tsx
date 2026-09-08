import ArrivalForm from './form';
import { Card } from '@/components/ui';

export const metadata = {
  title: 'Arriving in Toledo',
  description: 'Tell UTBSA when you land and we will arrange a pickup, somewhere to stay for the first few nights, and help with the first shop.',
};

export default function Arrive() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">
            Arriving in Toledo?
          </h1>
          <p className="mb-6 text-ink-mid">
            Tell us your flight and somebody will meet you. You do not need an account,
            you do not need to be a member yet, and it does not cost anything.
          </p>

          <Card className="mb-4 border-kantha bg-kantha-pale">
            <h2 className="mb-2 font-display text-base font-bold">What we can do</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              <li>Pick you up from Detroit or Toledo airport</li>
              <li>Find you a place to sleep for the first few nights</li>
              <li>Take you for a first grocery and bedding run</li>
              <li>Explain buses, phones, banking, and where to buy a winter coat</li>
            </ul>
          </Card>

          <Card>
            <h2 className="mb-2 font-display text-base font-bold">Who sees this</h2>
            <p className="text-sm text-ink-mid">
              Your flight and phone number are shown only to the member who volunteers
              to meet you, and to the e-board. Other members see a first name and a
              date so they know someone needs a lift — nothing more.
            </p>
          </Card>

          <p className="mt-4 text-sm text-ink-mid">
            Send this a week ahead if you can. A day&apos;s notice usually still works —
            ask anyway.
          </p>
        </div>

        <ArrivalForm />
      </div>
    </div>
  );
}
