import ContactForm from './form';

export const metadata = { title: 'Contact' };

export default function Contact() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-3xl font-bold sm:text-4xl">Contact us</h1>
      <p className="mb-8 max-w-xl text-ink-mid">
        Questions about joining, arriving in Toledo, or running an event with us — all welcome.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <ContactForm />
        <div className="space-y-5 text-sm">
          <div>
            <h2 className="mb-1 font-display text-base font-bold">Email</h2>
            <p className="text-ink-mid">utbsa@example.org</p>
          </div>
          <div>
            <h2 className="mb-1 font-display text-base font-bold">Arriving soon?</h2>
            <p className="text-ink-mid">
              Message us at least a week before you land so we can arrange a pickup and somewhere
              to stay for the first few nights.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-display text-base font-bold">Where to find us</h2>
            <p className="text-ink-mid">
              University of Toledo, 2801 W Bancroft St, Toledo, OH 43606
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
