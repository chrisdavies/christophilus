# Project structure

Occasionally on Hacker News, someone asks for codebases that demonstrate excellence. A few consistently top the list:

- [SQLite](https://www.sqlite.org/)
- [Redict](https://redict.io/)
- [OpenBSD](https://www.openbsd.org/) (and other BSDs)
- [Postgres](https://www.postgresql.org/)
- [Go](https://go.dev/)

I thought I'd do a quick analysis on these to see if there were any patterns.

## The problem space

First, all but OpenBSD are developer tools. They all deal with well-understood inputs and outputs. Unlike most of my projects, these don't have to deal with vague business requirements, subjective UI decisions, or fad-churn. I'm not sure how much these projects can inform my typical project, but it's worth a look.

## Structure

I pulled these (and a few other projects) down and ran an analysis of their directory structures:

```gen:table
Project                 Avg depth     # Directories   # Files     # Files / Dir

SQLite                  2.7           80              2308        28.9
Busybox                 2.3           183             3011        16.5
Redict                  3.0           106             1724        16.5
OpenBSD (without Gnu)   3.8           3031            47495       15.7
OpenBSD                 5.4           7245            99726       13.8
Postgres                3.6           634             7619        12.0
React                   3.8           553             7061        12.7
Node                    5.6           4034            47649       11.8
Go                      4.6           1485            14740       9.9
Vue (Core)              3.1           111             804         7.2
```

I have a bias for flat project structures, and this little experiment mostly reinforced that. I find it easier to get a quick sense of a project that has less nesting. More folders means more naming, and naming is hard. More folders means more choice. More choice means more decision-fatigue and opportunity for bikeshedding. When I add a new file, if the project structure is flat, it's trivial to answer, "Where does this belong?".

There's no right or wrong here; just preference. But those are some of my reasons for preferring flat projects. I'm in decent company.

## Long functions

I noticed that none of these projects shies away from long files and functions. For example, [time/format.go](https://github.com/golang/go/blob/master/src/time/format.go) has a 380 line function in it. There's much to be said for code-locality and code-linearity-- the ability to read top-down and be done, rather than having to jump all over various functions, files, and directories to follow the thread of logic.

## Simple languages

The commonly recommended projects are all C or Go-- two low-abstraction languages with plenty of footguns and detractors. This is probably not coincidental. My suspicion (anecdotally informed by my own history with C and Go) is that their rudimentary nature forces the programmer to plan ahead.

I vaguely remember a study that found that test takers performed better when the test was difficult to read (due to fuzzy fonts, printing glitches, etc). A similar effect was found for listening-comprehension. People remembered more when they had to strain to understand the speaker. The idea was that added difficulty kicked the brain into a higher-gear, and that had spillover effects. I wonder if a similar effect happens with programming languages. There's no doubt that expressivity of a language influences the kinds of thoughts the speakers have. In this case, is it possible that the lack of expressivity is a constraint that forces the brain into a higher-gear, leading to better outcomes?

When I write in a high-level language like TypeScript, it's easy to just jump right in and get cranking. I can quickly toss an idea together with no forethought. When I write Go, I have to think first. It's a pain to do something like map / filter / reduce, so I have to think more about my data structures and the operations I'll take on them. I usually end up with a program that does less. My typical Go program creates far fewer copies than the equivalent TypeScript code, and it usually has fewer features and edge-cases because I eliminate them out of laziness.

Languages which make over-abstraction painful probably tend to be more readable in the long-run. I'd bet that the average Go codebase is more approachable than-- for example-- the average Scala codebase. You're far less likely to run into an architecture astronaut in Go than you are in TypeScript or Scala.

All of that said, there are plenty of terrible, messy C and Go codebases, so maybe there's nothing to this...

## Comments

SQLite, Redict, and Go are well commented. In some cases, reading through [a random file](https://www.sqlite.org/src/file?name=src/resolve.c&ci=trunk) almost feels like you're reading a textbook on the related subject. Contrasting this with my nasty, under-commented code makes me feel like a slob. I'd guess that the practice of thorough commenting leads to more thorough thought and more robust implementations. It's another spillover effect.

## Just say no

The top codebases here are clearly run by folks who can say no. They say no to feature creep. They say no to over-abstraction. They know their core problem. If it falls outside of that core, it doesn't make the cut.

For example, let's take a look at `cat`:

- [busybox](https://github.com/mirror/busybox/blob/master/coreutils/cat.c)
- [OpenBSD](https://github.com/openbsd/src/blob/master/bin/cat/cat.c)
- [GNU coreutils](https://github.com/coreutils/coreutils/blob/master/src/cat.c)

I don't mean to throw shade on the GNU coreutils contributors. I use their stuff daily and am grateful to everyone involved! The busybox and OpenBSD projects have said "no" a lot more often than the coreutils projects have. I know which version I'd prefer to maintain!

## Surprises

A few surprises, taken at random:

I was surprised to find that OpenBSD's source is sparsely commented.

The headline of the OpenBSD `src/gnu` readme made me chuckle:

> This directory contains software that is Gigantic and Nasty but Unavoidable.

Busybox is nice. Really nice. It has clean, simple, and well-commented code organized in a shallow, flat folder structure. It should make the list the next time this topic comes up on HN.

Go was much more nested than I expected, and it is a counter example to my `flat=simple` formula. Go's source is nice though-- consistently formatted (thanks, `gofmt`!), well-commented, mostly straightforward.

## Conclusion

If you made it this far, you'll realize this isn't a scientific analysis at all, but mostly fluff and me reinforcing my priors. I did change my mind about commenting, though. I usually see comments as an antipattern (and they often are). "Focus on making your code readable rather than leaning on the crutch of commenting," I'd say. But the best of these projects have code that is both readable *and* well commented. The comments are thoughtful and comforting, and make me more confident that I can hop in and make changes without missing some critical detail.

TL;DR;

There's no earth-shattering new insight here. The takeaways are uncontroversial, standard advice:

- Flat project structure is nice-- try it
- Code locality and linearity are underrated
- Language constraints (and possibly, artificially imposed initial constraints) may help produce simpler, better solutions
- It's worth honing good writing / commenting skills
- Feature-creep is bad, mkay? Say no.

