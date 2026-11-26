# DS-10: цитаты, которых нет в снимках — рабочий список

Собрано 25.11.2026 после переснятия. `python -m tools.validate` → 11 записей, 40 цитат.
Почему так вышло: робот «Слежение» и поздние правки обновляли цитаты и хеши по живым страницам,
а снимки в `raw/` не сохранялись. 25.11 все 12 программ переснял (`raw/<id>/2026-11-25/`);
austria-study, barnard-college, cmu, nucb после этого прошли. У cornell, vanderbilt-university и
vassar-college последний снимок 25.11 сделал DS-1, сайт с тех пор поменял текст.

«Условие N» — N-й элемент `textConditions` (с 1). Поля без номера (`language`, `schoolYears`,
`exam` и т. п.) — цитата в `eligibility.<поле>.evidence`.

## `auca` — снимок `raw/auca/2026-11-25/`

- `00.txt` https://www.auca.kg/en/freshman_applicants/
- `01.txt` https://www.auca.kg/en/apply_international/
- `02.txt` https://www.auca.kg/en/admissions/
- `03.txt` https://auca.kg/en/p6088598350/
- `04.txt` https://www.auca.kg/en/merit-based/
- `05.txt` https://uzbekistan.americancouncils.org/us-caef-en
- `06.txt` https://www.americancouncils.org/programs/us-caef-fellowships
- `07.txt` https://auca.kg/en/auca_news/6375/

1. **условие 3**
   - цитата в данных: «Last day to register for the admissions exam is November 3, 2026, 17.00. The admissions exam date is November 7, 2026.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `cornell` — снимок `raw/cornell/2026-11-25/`

- `00.txt` https://admissions.cornell.edu/how-to-apply/first-year-applicants
- `01.txt` https://admissions.cornell.edu/policies/standardized-testing-policy
- `02.txt` https://finaid.cornell.edu/first-year-and-transfer-students-international
- `03.txt` https://finaid.cornell.edu/cost-to-attend/financial-aid-eligibility

2. **условие 7**
   - цитата в данных: «First-year applicants are required to submit the SAT or ACT scores when applying to Cornell.»
   - в свежем снимке: `01.txt`, совпадает начало 45 из 92 знаков: «First-year applicants are required to submit SAT or ACT scores when applying to Cornell. Applicants may self-report test scores* on the testing section …»

## `fudan-university` — снимок `raw/fudan-university/2026-11-25/`

- `00.txt` https://iso.fudan.edu.cn/isoenglish/16199/list.htm
- `01.txt` https://econ.fudan.edu.cn/uipe/Prospective_Students1/Tuition_and_Expenses.htm
- `02.txt` https://econ.fudan.edu.cn/uipe/info/1122/1432.htm

3. **условие 1**
   - цитата в данных: «2026 List of English-taught Undergraduate Programs of Fudan»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
4. **условие 4**
   - цитата в данных: «Fudan School of Economics Dean's Scholarship It is awarded to the top international students of the UIPE program at the end of each academic year based on the academic performance.»
   - в свежем снимке: `02.txt`, совпадает начало 105 из 180 знаков: «Fudan School of Economics Dean's Scholarship It is awarded to the top international students of the UIPE and UIPI programs at the end of each academic year based mainly on the academic performance. Contact Us Email: uipe@fudan.edu.cn Tel.: …»

## `hkbu-hongkong` — снимок `raw/hkbu-hongkong/2026-11-25/`

- `00.txt` https://admissions.hkbu.edu.hk/admissions/international-qualifications.html
- `01.txt` https://admissions.hkbu.edu.hk/fees-and-scholarships.html
- `02.txt` https://admissions.hkbu.edu.hk/en/scholarships.html

5. **условие 6**
   - цитата в данных: «For the Bachelor of Arts (Hons) in Music programme, applicants are required to submit their music qualifications and/or examination results.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
6. **условие 7**
   - цитата в данных: «In addition, applicants will submit a portfolio, and shortlisted applicants may be invited to attend an aptitude test, interview and/or audition.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
7. **условие 8**
   - цитата в данных: «For the Bachelor of Music (Hons) in Creative Industries programme, applicants are required to submit the following materials: The examination results of music qualification (Practical, Theory), including but not limited to the Associate Board of the Royal Schools of Music (Preferable Result: Practical/Performance: Grade 8 or above, Theory: Grade 5 or above)»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
8. **условие 9**
   - цитата в данных: «A portfolio via an online portfolio submission system.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `nazarbayev` — снимок `raw/nazarbayev/2026-11-25/`

- `00.txt` https://nu.edu.kz/admissions/how-to-apply/foundation-undergraduate/regular-admissions/
- `01.txt` https://nu.edu.kz/admissions/how-to-apply/foundation-undergraduate/financial-aid-end-scholarships/
- `02.txt` https://nu.edu.kz/admissions/international-admission/international-admission_general/

9. **условие 2**
   - цитата в данных: «NUET Applicants (NUFYP and Undergraduate programs, including international applicants) : October 2026 - To be announced later»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
10. **условие 3**
   - цитата в данных: «International applicants applying for undergraduate programs, as well as for the NUFYP program under the SAT/ACT category : October 2026 - to be announced later.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `ntu-singapore` — снимок `raw/ntu-singapore/2026-11-25/`

- `00.txt` https://www.ntu.edu.sg/admissions/undergraduate/admission-guide/international-qualifications
- `01.txt` https://www.ntu.edu.sg/admissions/undergraduate/financial-matters/tuition-grants
- `02.txt` https://www.ntu.edu.sg/admissions/undergraduate/financial-matters/tuition-fees
- `03.txt` https://www.ntu.edu.sg/admissions/undergraduate/scholarships
- `04.txt` https://www.moe.gov.sg/financial-matters/tuition-grant-scheme
- `05.txt` https://www.moe.gov.sg/financial-matters/tuition-grant-scheme/overview
- `06.txt` https://www.ntu.edu.sg/admissions/undergraduate/admissions/application-process

11. **language**
   - цитата в данных: «Applicants who did not take English language in Junior and Senior High School or who have taken English language only as a second language»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
12. **условие 7** (та же цитата, что выше)
   - цитата в данных: «Applicants who did not take English language in Junior and Senior High School or who have taken English language only as a second language»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
13. **условие 8**
   - цитата в данных: «Pearson Test of English (PTE) Academic Overall score - 55 Speaking - 55, Writing - 59 C1 Advanced (formerly Cambridge English Advanced (CAE)) Overall score - 170 Writing - 170 Speaking - 170 SAT Total score - 1250 Reading and Writing - 60 ACT with Writing in a single sitting Composite - 30 English - 30 Writing - 7 Aptitude Scholastic Test (AST) English Score - 220»
   - в свежем снимке: `00.txt`, совпадает начало 238 из 366 знаков: «Pearson Test of English (PTE) Academic Overall score - 55 Speaking - 55, Writing - 59 C1 Advanced (formerly Cambridge English Advanced (CAE)) Overall score - 170 Writing - 170 Speaking - 170 SAT Total score - 1250 Reading and Writing - 600 ACT with Writing in a single sitting Composite - 30 English - 30 Writing - 7 Aptitude Scholastic Test (AST) English Score - 220 For IELTS, TOEFL, PTE Academic, C1 Advanced, and AST , onl…»
14. **условие 13**
   - цитата в данных: «Some of our programmes have specific subject requirements. Check the minimum subject requirements of the programmes you wish to apply for.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
15. **условие 17**
   - цитата в данных: «We require that you submit your English-language proficiency scores by the stated deadline of your application window. No late submission is allowed.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `polimi` — снимок `raw/polimi/2026-11-25/`

- `00.txt` https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/students-with-a-foreign-degree
- `01.txt` https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/requirements-to-participate-in-the-admission-test
- `02.txt` https://www.polimi.it/en/prospective-students/how-to-apply/admission-to-laurea-programmes/engineering
- `03.txt` https://www.polimi.it/en/students/language-requirements
- `04.txt` https://www.polimi.it/en/prospective-students/how-much-does-it-cost/scholarships
- `05.txt` https://www.polimi.it/en/prospective-students/how-much-does-it-cost/laurea-laurea-magistrale-and-single-cycle-programmes

16. **citizenship**
   - цитата в данных: «regardless of their nationality or place of residence»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
17. **schoolYears**
   - цитата в данных: «you must hold a secondary school qualification obtained after a minimum of 12/13 years of schooling, overall»
   - в свежем снимке: `00.txt`, совпадает начало 62 из 108 знаков: «you must hold a secondary school qualification obtained after completing at least a total number of 12 or 13 years of schooling completed. See Annex 1 to find out what …»
18. **gpa**
   - цитата в данных: «These may relate to the total number of years of schooling completed, the final diploma grade/score, or the successful passing an academic suitability test.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
19. **language**
   - цитата в данных: «have an appropriate B2 level certification of proficiency in the Italian language issued by the CLIQ»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
20. **условие 1**
   - цитата в данных: «Politecnico di Milano accepts the successful passing of a foundation course of at least one academic year»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
21. **условие 2** (та же цитата, что выше)
   - цитата в данных: «These may relate to the total number of years of schooling completed, the final diploma grade/score, or the successful passing an academic suitability test.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
22. **условие 3** (та же цитата, что выше)
   - цитата в данных: «have an appropriate B2 level certification of proficiency in the Italian language issued by the CLIQ»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
23. **условие 4**
   - цитата в данных: «In order to be admitted to Bachelor of Science programmes held in English, you must demonstrate: proficiency in English prior to enrolment.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
24. **условие 5**
   - цитата в данных: «SAT (provided by The College Board www.collegeboard.org), test administered in English»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
25. **условие 6**
   - цитата в данных: «Certain categories of international students are allocated a specific number of places, referred to as RESERVED PLACES.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
26. **условие 7**
   - цитата в данных: «issued each year by the Ministry of University and Research»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
27. **условие 8**
   - цитата в данных: «report cards from the last three years of secondary school, stamped and signed by the competent authority/office»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
28. **условие 9**
   - цитата в данных: «When to register for the tests»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
29. **условие 14** (та же цитата, что выше)
   - цитата в данных: «report cards from the last three years of secondary school, stamped and signed by the competent authority/office»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
30. **условие 15**
   - цитата в данных: «the final secondary school diploma, if already obtained, or a letter confirming enrolment in the final year of secondary school, stamped and signed by the competent authority/office»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
31. **условие 16**
   - цитата в данных: «must upload the transcript of the exams passed and the course descriptions of the individual courses in the dedicated application»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
32. **условие 17**
   - цитата в данных: «the information will be verified through the document of identification you uploaded to Online Services»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
33. **условие 18**
   - цитата в данных: «Proficiency can be demonstrated by uploading a valid language certification in the language in which the course is taught.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `tianjin-university` — снимок `raw/tianjin-university/2026-11-25/`

- `00.txt` https://sie.tju.edu.cn/en/xwxm/UNDERGRADUATE/202609/t20260930_324729.html
- `01.txt` https://en.tju.edu.cn/info/1017/11186.htm
- `02.txt` https://sie.tju.edu.cn/en/jxj/tjdxjxj/

34. **условие 14**
   - цитата в данных: «Photocopy of passport within the validity period after September 1st, 2026 .»
   - в свежем снимке: `00.txt`, совпадает начало 73 из 76 знаков: «Photocopy of passport within the validity period after September 1st, 202 7 . Applicants who have immigrated to other countries or whose…»
35. **условие 22**
   - цитата в данных: «A pplicants who are still under the age of 18 as of September 1st, 202 6 must submit the original guardian certificate .»
   - в свежем снимке: `00.txt`, совпадает начало 71 из 120 знаков: «A pplicants who are still under the age of 18 as of September 1st, 202 7 must submit the original guardian certificate . 13. Other attachments (such as Certificate of award etc. ) …»

## `utwente` — снимок `raw/utwente/2026-11-25/`

- `00.txt` https://www.utwente.nl/en/education/bachelor/how-to-apply/
- `01.txt` https://www.utwente.nl/en/education/bachelor/how-to-apply/language-requirements/
- `02.txt` https://www.utwente.nl/en/education/bachelor/apply/bachelor-deadlines/
- `03.txt` https://www.utwente.nl/en/education/bachelor/apply/tuition-fees/
- `04.txt` https://www.utwente.nl/en/education/bachelor/application-admission/application/required-application-documents/

36. **language**
   - цитата в данных: «TOEFL iBT (internet-based) certificate (after January 2026) not older than two years, with an overall score of 4,5, and a minimum score of 4,5 on reading, listening and writing.»
   - в свежем снимке: `01.txt`, совпадает начало 112 из 177 знаков: «TOEFL iBT (internet-based) certificate (after January 2026) not older than two years, with an overall score of 4.5, and a minimum score of 4.5 on reading, listening and writing. For speaking a minimum score of 4 is required. Please note …»

## `vanderbilt-university` — снимок `raw/vanderbilt-university/2026-11-25/`

- `00.txt` https://admissions.vanderbilt.edu/apply/international.php
- `01.txt` https://admissions.vanderbilt.edu/affordability/international-costs-and-finances/
- `02.txt` https://www.vanderbilt.edu/financialaid/undergraduate/international/
- `03.txt` https://admissions.vanderbilt.edu/apply/first-year-process/

37. **условие 6**
   - цитата в данных: «The University has no need-based aid available for international transfer applicants who are not U.S. citizens or eligible non-citizens.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)

## `vassar-college` — снимок `raw/vassar-college/2026-11-25/`

- `00.txt` https://www.vassar.edu/admission/apply/international/
- `01.txt` https://www.vassar.edu/admission/apply/requirements/
- `02.txt` https://www.vassar.edu/admission/apply/how-to-apply/
- `03.txt` https://www.vassar.edu/admission/apply/financial-aid/
- `04.txt` https://www.vassar.edu/admission/financial-aid/tuition/
- `05.txt` https://www.vassar.edu/admission/financial-aid/apply/

38. **условие 6**
   - цитата в данных: «Test results MUST be submitted from Duolingo directly at the time of application.»
   - в свежем снимке: начало цитаты в снимке не найдено — искать по смыслу (`python -m tools.look <id> <слово>`)
39. **условие 13**
   - цитата в данных: «If the application fee poses a financial hardship, a fee waiver can be requested on the Common Application or the Coalition Application.»
   - в свежем снимке: `02.txt`, совпадает начало 114 из 136 знаков: «If the application fee poses a financial hardship, a fee waiver can be requested on the Common Application or the Apply Coalition with Scoir application. Fee waivers are automatically offered to a…»
40. **условие 16**
   - цитата в данных: «We accept the IELTS Academic. We do NOT accept the IELTS General Training.»
   - в свежем снимке: `00.txt`, совпадает начало 36 из 74 знаков: «We accept the IELTS Academic. We do not accept the IELTS General Training. Test results from the testing agency are strongly preferred…»
