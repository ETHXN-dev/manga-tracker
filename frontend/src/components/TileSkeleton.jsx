export default function TileSkeleton() {
  return (
    <div className="tile-skeleton">
      <div className="tile-skeleton-cover">
        <div className="skeleton" />
      </div>
      <div className="tile-skeleton-info">
        <div className="skeleton tile-skeleton-title" />
        <div className="skeleton tile-skeleton-title-short" />
        <div className="skeleton tile-skeleton-chapter" />
        <div className="skeleton tile-skeleton-link" />
      </div>
    </div>
  );
}
