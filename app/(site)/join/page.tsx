import JoinForm from './form';
import { Card } from '@/components/ui';

export const metadata = { title: 'Join' };

export default function Join() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="mb-3 font-display text-3xl font-bold sm:text-4xl">Join UTBSA</h1>
          <p className="mb-6 text-ink-mid">
            A minute at most. Everything else you fill in later, at your own pace, and
            you decide what other members can see.
          </p>
          <Card className="border-kantha bg-kantha-pale">
            <h2 className="mb-2 font-display text-base font-bold">What happens next</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              <li>We email you a link to confirm the address.</li>
              <li>An e-board member approves you, usually within a day.</li>
              <li>You get a sign-in link. There is no password to remember.</li>
              <li>Students and alumni give two addresses — either one signs you in,
                  so nothing breaks when your UToledo account closes.</li>
            </ol>
          </Card>
        </div>
        <JoinForm />
      </div>
    </div>
  );
}
