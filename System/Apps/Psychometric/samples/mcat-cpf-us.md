# MCAT — Chemical & Physical Foundations / Data-Based Statistical Reasoning — US

**Reference test:** MCAT — Chemical and Physical Foundations of Biological Systems (CPFBS) section (US medical school admissions)
**Format:** 59 questions, 95 minutes. Passage-based: 10 passages, each with 4–7 questions. Each passage describes a research scenario with data (tables, graphs, or figures) drawn from chemistry, physics, biochemistry, or molecular biology.
**Answer style:** Single correct answer (A–D). Binary scoring.
**Distinctive feature:** Questions require integrating passage information, data analysis, and foundational science knowledge. Not purely data interpretation — combines reading, reasoning, and science knowledge.

---

## MCAT CPF Passage — Enzyme Kinetics Study

**Difficulty:** Hard
**Background knowledge assumed:** Basic enzyme kinetics, Michaelis-Menten concepts, competitive vs. non-competitive inhibition.

### Stimulus

Researchers studying a newly discovered bacterial enzyme, hydrolase-X, conducted a series of kinetic assays to characterise its activity. The enzyme catalyses the hydrolysis of a synthetic substrate (Substrate-S) into two products. Initial reaction velocities (V₀) were measured at varying substrate concentrations [S], both in the absence and presence of two potential inhibitors: Compound-A and Compound-B. All assays were conducted at pH 7.4 and 37°C with a fixed enzyme concentration of 2.0 nM.

**TABLE 1: Initial Velocity Data for Hydrolase-X**

| [S] (mM) | V₀, No Inhibitor (μM/s) | V₀, + Compound-A (μM/s) | V₀, + Compound-B (μM/s) |
|-----------|------------------------|--------------------------|--------------------------|
| 0.5 | 12.5 | 6.3 | 7.1 |
| 1.0 | 20.0 | 12.5 | 11.8 |
| 2.0 | 28.6 | 22.2 | 18.2 |
| 4.0 | 36.4 | 32.0 | 26.7 |
| 8.0 | 42.1 | 40.0 | 34.8 |

---

**FIGURE 1: Lineweaver-Burk Plot (1/V₀ vs. 1/[S])**

*The double-reciprocal plot for the no-inhibitor condition yields a straight line with the following linear regression: y = 0.024x + 0.018 (R² = 0.998), where y is 1/V₀ in s/μM and x is 1/[S] in mM⁻¹.*

---

### Questions

**1.** Based on Table 1, what effect does Compound-A have on the maximum velocity (Vmax) of hydrolase-X?

- **A:** Vmax is unchanged.
- **B:** Vmax is decreased.
- **C:** Vmax is increased.
- **D:** The data are insufficient to determine the effect on Vmax.

**Correct Answer:** **A**

**Explanation:** Examining the no-inhibitor and +Compound-A columns at high [S]: at 8.0 mM, V₀ is 42.1 vs. 40.0 μM/s — these approach the same maximum as [S] increases. The velocities with Compound-A approach the same Vmax as the uninhibited enzyme at saturating substrate concentrations, which is characteristic of competitive inhibition (Vmax unchanged, apparent Km increased). Waiting for confirmation: the Lineweaver-Burk data would show lines intersecting at the y-axis for competitive inhibition.

---

**2.** Using the Lineweaver-Burk regression equation for the no-inhibitor condition, what is the Km of hydrolase-X for Substrate-S?

- **A:** 0.75 mM
- **B:** 1.33 mM
- **C:** 18.0 mM
- **D:** 41.7 mM

**Correct Answer:** **B**

**Explanation:** The Lineweaver-Burk equation is 1/V₀ = (Km/Vmax)(1/[S]) + 1/Vmax. Comparing to y = 0.024x + 0.018:
- Slope = Km/Vmax = 0.024 s·mM/μM
- y-intercept = 1/Vmax = 0.018 s/μM → Vmax = 1/0.018 = 55.6 μM/s
- Km = slope × Vmax = 0.024 × 55.6 = 1.33 mM

---

**3.** Compound-B at 8.0 mM substrate gives V₀ = 34.8 μM/s, notably lower than the +Compound-A condition (40.0 μM/s). At even higher substrate concentrations, the velocity in the presence of Compound-B continues to plateau below the uninhibited Vmax. This pattern is most consistent with which type of inhibition?

- **A:** Competitive inhibition
- **B:** Non-competitive inhibition
- **C:** Uncompetitive inhibition
- **D:** Irreversible inhibition

**Correct Answer:** **B**

**Explanation:** Compound-B reduces V₀ at all substrate concentrations including the highest (34.8 vs. 42.1 uninhibited at 8.0 mM), and the velocities plateau at a lower maximum than the uninhibited enzyme. This is characteristic of non-competitive inhibition, where the inhibitor binds to both the free enzyme and the enzyme-substrate complex, reducing the effective Vmax without changing Km. Compound-A, by contrast, shows the pattern of competitive inhibition (Vmax unchanged, requiring more substrate to reach it).

---

**4.** If the enzyme concentration in the assay were doubled to 4.0 nM while keeping all other conditions identical, how would the Vmax in the no-inhibitor condition change?

- **A:** Vmax would double to approximately 111 μM/s.
- **B:** Vmax would remain unchanged.
- **C:** Vmax would increase by an indeterminate amount.
- **D:** Vmax would decrease because of enzyme aggregation at higher concentrations.

**Correct Answer:** **A**

**Explanation:** Vmax is directly proportional to enzyme concentration: Vmax = kcat × [E]total. Doubling [E] doubles Vmax (assuming no aggregation or other artefacts at this concentration range). This is a fundamental enzyme kinetics concept.

---

*Sample adapted for MCAT CPF format. Passage-based with data table and graph description, 4 questions integrating data analysis with biochemistry knowledge (enzyme kinetics). Tests the MCAT-specific skill of extracting meaning from research data and applying foundational science concepts. All content is original creation.*
