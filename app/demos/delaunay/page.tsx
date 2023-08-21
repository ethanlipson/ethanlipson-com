'use client';

import Demo from '@/src/demos/delaunay/demo';
import DemoTemplate from '@/src/components/demoTemplate';

export default function Delaunay() {
  return (
    <DemoTemplate demo={<Demo />}>
      <h1>Delaunay Triangulation</h1>
      <p>
        The Delaunay Triangulation, developed by Boris Delaunay in 1934, is a
        way of triangulating a set of points in a way that generally avoids
        long, thin triangles. Its use is seen throughout engineering and
        computer science, whenever we need to generate a mesh from a set of
        points.
      </p>
      <h3>Controls</h3>
      <p>
        Click to add a point
        <br />
        Click and drag to move a point
        <br />
        Click a point to remove it
      </p>
      <div style={{ height: '50px' }} />
      <h2>HOW IT WORKS</h2>
      <p>
        There are many algorithms to create a Delaunay triangulation. Here, I
        implemented the Bowyer-Watson algorithm, which isn&apos;t the fastest,
        but it&apos;s much more intuitive than the competition. But before going
        into the algorithm, we must first understand what a Delaunay
        Triangulation is.
      </p>
      <h3>What is a Delaunay Triangulation</h3>
      <p>
        It&apos;s pretty common to want to connect a bunch of points with
        triangles, whether we&apos;re making a 3D model or trying to create a
        stable structure. As you can imagine, there are many, many ways to draw
        these triangles, but some of them are more preferable than others.
        Ideally, we would want nice, big triangles, not long, thin ones. The
        Delaunay Triangulation ensures that we get as few thin triangles as
        possible.
      </p>
      <p>
        In particular, Delaunay Triangulations maximize the smallest angle out
        of all the triangles. Small angles lead to long, thin triangles, so by
        maximizing the smallest angle, we can avoid these problematic triangles.
        If a triangulation does not follow this property of maximizing the
        smallest angle, we say it is no longer <i>Delaunay</i>.
      </p>
      <h3>The Bowyer-Watson Algorithm</h3>
      <p>
        The Bowyer-Watson algorithm is the most well-known and easily understood
        way of generating a Delaunay Triangulation. The algorithm itself is not
        especially interesting, but the principles behind it are applicable to a
        wide range of problems.
      </p>
      <p>
        The basic idea behind the algorithm is that we start with one triangle,
        and successively add points until the triangulation is no longer
        Delaunay. At this point, we remove the points violating the constraint,
        and add them back around our new point to make sure everything is in
        order. This concept of building a solution by removing the parts that
        don&apos;t work and adding them back later is seen everywhere in
        computer science. It&apos;s related to <i>backtracking</i>, a common way
        to solve sudoku puzzles.
      </p>
    </DemoTemplate>
  );
}
