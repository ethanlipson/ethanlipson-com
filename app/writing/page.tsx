"use client";

import PageTemplate from "@/src/components/pageTemplate";
import Link from "next/link";
import "../globals.css";

export default function Writing() {
  return (
    <PageTemplate highlightWriting>
      <h1>Writing</h1>
      <p>
        October 18, 2024
        <br />
        <Link href="/writing/exp-equivalence">
          <b>
            The Many Faces of e<sup>x</sup>
          </b>
        </Link>
      </p>
      <p>
        October 13, 2024
        <br />
        <Link href="/writing/rotation">
          <b>Why Do Rotations Happen Around an Axis?</b>
        </Link>
      </p>
      <p>
        January 31, 2024
        <br />
        <Link href="/writing/measure">
          <b>Continuity of Measure</b>
        </Link>
      </p>
      <p>
        November 19, 2023
        <br />
        <Link href="/writing/counting">
          <b>How to Count</b>
        </Link>
      </p>
      <p>
        September 23, 2023
        <br />
        <Link href="/writing/complex-3d">
          <b>Where are the 3D Complex Numbers?</b>
        </Link>
      </p>
      <p>
        September 6, 2023
        <br />
        <Link href="/writing/tensors">
          <b>What the **** is a Tensor?</b>
        </Link>
      </p>
      <p>
        September 2, 2023
        <br />
        <Link href="/writing/complex-polynomials">
          <b>Complex Numbers are Secretly Polynomials</b>
        </Link>
      </p>
    </PageTemplate>
  );
}
