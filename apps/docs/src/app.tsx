import { HoldButton, type HoldButtonState } from "onpurpose";
import { useState } from "react";
import { Figure } from "./components/figure";
import { ProjectRow } from "./components/project-row";
import { SyncState } from "./components/sync-state";
import {
  asyncCode,
  install,
  labelCode,
  messagesCode,
  rowCode,
  tailwindCode,
  usage,
  variablesCode,
} from "./examples";
import { handled } from "./handled";

export function App() {
  const [confirmed, setConfirmed] = useState(0);
  const [sendState, setSendState] = useState<HoldButtonState>("idle");

  return (
    <main className="page">
      <header>
        <h1>onpurpose</h1>
        <p className="lede">
          A hold-to-confirm button for React, for the actions you don't want on a misclick: delete,
          publish, revoke, send. Hold it until it fills. Let go early and nothing happens.
        </p>
      </header>

      <div className="hero">
        <Figure code={usage}>
          <HoldButton onConfirm={() => setConfirmed((count) => count + 1)}>
            Hold to delete
          </HoldButton>
          <p className="result" data-testid="confirms" data-count={confirmed}>
            {confirmed === 0
              ? "Hold it until it fills. A click, or letting go halfway, leaves the project alone."
              : "Project deleted."}
          </p>
        </Figure>
      </div>

      <section className="section">
        <h2>Install</h2>
        <pre>
          <code>{install}</code>
        </pre>
        <p>
          Works with React 18.3 and 19. There's no provider and no stylesheet to import. The button
          picks up the font and color of the page it's on.
        </p>
      </section>

      <section className="section">
        <h2>Guide</h2>
        <p>
          <code>onConfirm</code> is the only prop you need. Everything else is for changing the
          label or the look.
        </p>

        <ol className="steps">
          <li className="step">
            <h3>Pass the action</h3>
            <p>
              <code>onConfirm</code> runs once, when the hold completes. The children are the label.
              The example at the top is the whole thing.
            </p>
            <p>
              The hold takes 1.5 seconds, and that isn't configurable. The fill crosses the button
              in exactly that time, so you can see how close you are. Let go early and the fill
              eases back without running anything. While you press, the button settles in slightly.
            </p>
            <p>
              The button never submits or resets a form, even with <code>type="submit"</code>. If
              sending the form is the action, do it in <code>onConfirm</code>.
            </p>
          </li>

          <li className="step">
            <h3>Change the label</h3>
            <p>
              Pass a function as <code>children</code> when the words should follow the hold. It
              receives <code>idle</code>, <code>holding</code> or <code>confirmed</code>.{" "}
              <code>confirmed</code> lasts while you keep holding, and for a moment after you let
              go.
            </p>
            <Figure code={labelCode}>
              <HoldButton onConfirm={() => {}}>
                {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
              </HoldButton>
            </Figure>
          </li>

          <li className="step">
            <h3>Wait for a request</h3>
            <p>
              If the action is a request, return its promise. Until it settles, the button stays
              confirmed, sets <code>aria-busy</code>, and won't start another hold. The label
              function's second argument tells you when it's busy. If the promise rejects, the
              button returns to idle and the error is rethrown, so your own error handling still
              sees it.
            </p>
            <Figure code={asyncCode}>
              <HoldButton onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1200))}>
                {(state, { busy }) =>
                  busy ? "Archiving…" : state === "confirmed" ? "Archived" : "Hold to archive"
                }
              </HoldButton>
            </Figure>
          </li>

          <li className="step">
            <h3>Set the colors</h3>
            <p>
              Font and color come from the page, so light and dark themes usually work as they are.{" "}
              <code>--hold-fill</code> is the wash that shows progress.{" "}
              <code>--hold-confirmed</code> is the solid color when a hold completes, and the label
              on it turns white or black, whichever reads better. Set{" "}
              <code>--hold-confirmed-text</code> to choose that color yourself.
            </p>
            <p>
              To style each phase yourself, use <code>data-state</code>: idle, holding or confirmed.
            </p>
            <Figure code={variablesCode}>
              <HoldButton className="send" onConfirm={() => {}}>
                {(state) => (
                  <SyncState state={state} onChange={setSendState}>
                    Hold to send
                  </SyncState>
                )}
              </HoldButton>
              <p className="state" data-state={sendState}>
                <code>data-state="{sendState}"</code>
              </p>
            </Figure>
          </li>

          <li className="step">
            <h3>Use your own classes</h3>
            <p>
              <code>className</code> goes on the <code>&lt;button&gt;</code>. The built-in styles
              live in <code>@layer components</code>, the layer Tailwind uses for components, so
              your classes and Tailwind utilities override them, and Tailwind's reset leaves the
              button intact. This example runs on real Tailwind.
            </p>
            <Figure code={tailwindCode}>
              <HoldButton
                className="rounded-full text-red-700 dark:text-red-300"
                onConfirm={() => {}}
              >
                Hold to revoke
              </HoldButton>
            </Figure>
          </li>

          <li className="step">
            <h3>Put it where the damage happens</h3>
            <p>
              Put the button at the end of the row it removes. Click the row and it opens. Hold
              remove and the project goes, without the row opening as well.
            </p>
            <Figure code={rowCode}>
              <ProjectRow />
            </Figure>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2>API</h2>
        <h3>Props</h3>
        <ul className="list">
          <li>
            <code>onConfirm</code> runs when a hold completes. Return a promise to keep the button
            busy until it settles.
          </li>
          <li>
            <code>children</code> is the label: a node, or a function of the state and{" "}
            <code>{"{ busy }"}</code>.
          </li>
          <li>
            <code>messages</code> sets the screen reader text: <code>hint</code>,{" "}
            <code>confirmed</code> and <code>again</code>.
          </li>
          <li>
            Every other <code>&lt;button&gt;</code> prop is passed through, and <code>type</code>{" "}
            defaults to <code>button</code>. <code>onClick</code> is left out on purpose, because a
            click isn't the action. Handlers you pass run first, and <code>preventDefault</code>{" "}
            stops the hold from starting. <code>ref</code> points at the <code>&lt;button&gt;</code>
            .
          </li>
        </ul>
        <h3>CSS custom properties</h3>
        <ul className="list">
          <li>
            <code>--hold-fill</code> is the wash that shows progress. It defaults to the text color
            at 16%.
          </li>
          <li>
            <code>--hold-confirmed</code> is the solid color when a hold completes. It defaults to
            the text color and fades out when you let go.
          </li>
          <li>
            <code>--hold-confirmed-text</code> is the label color on top of it. It defaults to white
            or black, whichever reads better.
          </li>
        </ul>
        <h3>Attributes</h3>
        <ul className="list">
          <li>
            <code>data-state</code> is <code>idle</code>, <code>holding</code> or{" "}
            <code>confirmed</code>.
          </li>
          <li>
            <code>data-disabled</code> is set while the button is disabled.
          </li>
          <li>
            <code>aria-busy</code> is set while a returned promise is pending.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>What it handles</h2>
        <p>
          A quick click won't run the action. The button also gives up when you drag off, switch
          away, or a second finger joins in.
        </p>
        {handled.map((group) => (
          <div className="handled" key={group.title}>
            <h3>{group.title}</h3>
            <ul className="list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>Accessibility</h2>
        <p>
          It's a real <code>&lt;button&gt;</code> with a visible focus ring. Its name is the label,
          unless you pass <code>aria-label</code> or <code>aria-labelledby</code>. A hidden hint,
          “Press and hold to confirm”, is attached with <code>aria-describedby</code>, after any ids
          you pass. When a hold completes, a live region right after the button announces
          “Confirmed”. The announcement stands even if the button is disabled the moment it
          confirms.
        </p>
        <h3>Other languages</h3>
        <p>
          All three phrases are English until you pass <code>messages</code>. Anything you leave out
          stays English.
        </p>
        <pre>
          <code>{messagesCode}</code>
        </pre>
        <h3>Touch and contrast</h3>
        <p>
          On touch screens the tap target is at least 44px tall, without making the button bigger.
          In forced colors mode, the fill and the confirmed state use Highlight, since a faint wash
          could disappear. When someone asks for more contrast, the fill gets stronger.
        </p>
        <h3>Screen readers</h3>
        <p>
          Screen readers usually activate a button with a single click, not a 1.5 second hold. So a
          click that comes without a press on the button is treated as deliberate. The first one
          arms the button and announces “Activate again to confirm”. A second one within 10 seconds
          confirms. Moving focus away, or waiting longer, starts over.
        </p>
        <p>
          Mouse clicks and taps always come with a press, so they never arm the button. A
          double-click or double-tap still can't delete anything. Code that calls{" "}
          <code>button.click()</code> twice goes down the same path as a screen reader.
        </p>
        <ul className="list">
          <li>
            NVDA and JAWS in browse mode, and VoiceOver on macOS with VO+Space, send a plain click:
            activate twice to confirm. In focus or pass-through mode, holding Space or Enter works
            as it does for everyone.
          </li>
          <li>
            VoiceOver on iOS and TalkBack may send a double-tap as a short tap, which doesn't arm
            the button. Double-tap and hold passes a real hold through, and that confirms.
          </li>
          <li>
            This was tested with the events browsers receive, not with every screen reader and
            browser pairing. If one behaves differently, please open an issue.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>Server rendering</h2>
        <p>
          On React 19 the styles render with the page, so a server-rendered button, including in the
          Next.js App Router, is styled before any JavaScript runs. On React 18 they're added when
          the first button mounts, so until then it looks like a plain button. The hidden screen
          reader text never shows either way.
        </p>
        <p>
          The styles arrive as a <code>&lt;style&gt;</code> element, and server-rendered markup
          hides the screen reader text with inline <code>style</code> attributes. A strict Content
          Security Policy has to allow inline styles (<code>style-src 'unsafe-inline'</code>).
          Without that, the button still works but looks like a plain browser button.
        </p>
      </section>

      <p className="footer">
        <a href="https://github.com/mxrtcendik/onpurpose">MIT</a>. Mert Cendik.
      </p>
    </main>
  );
}
