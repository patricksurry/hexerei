import numpy as np
import cv2

class GridModel:
    def __init__(self, params=None):
        # Params: [tx, ty, rot_deg, scale, tilt_x, tilt_y, focal]
        if params is None:
            self.params = np.array([0, 0, 0, 50, 0, 0, 1000], dtype=np.float64)
        else:
            self.params = np.array(params, dtype=np.float64)

    def get_homography(self, w, h):
        tx, ty, rot, scale, tilt_x, tilt_y, f = self.params
        
        # 1. Grid Space -> World Space (Similarity)
        # Center of scaling/rotation? Let's use (0,0) in grid space effectively.
        # But we want (tx, ty) to be the center of the grid in image space.
        
        # Let's construct matrix chains.
        # T_image: Move to image center? or (tx, ty) directly.
        # R_grid: Rotation
        # S_grid: Scale
        
        # Camera Intrinsics
        # Assume principal point is image center
        cx, cy = w / 2.0, h / 2.0
        K = np.array([
            [f, 0, cx],
            [0, f, cy],
            [0, 0, 1]
        ])
        
        # Camera Extrinsics (Tilt)
        # Rotation around X and Y axis
        rx = np.radians(tilt_x)
        ry = np.radians(tilt_y)
        
        Rx = np.array([
            [1, 0, 0],
            [0, np.cos(rx), -np.sin(rx)],
            [0, np.sin(rx), np.cos(rx)]
        ])
        
        Ry = np.array([
            [np.cos(ry), 0, np.sin(ry)],
            [0, 1, 0],
            [-np.sin(ry), 0, np.cos(ry)]
        ])
        
        # Composite Rotation
        R_cam = Rx @ Ry 
        
        # Camera Translation
        # We assume the camera is at Z=dist looking at origin?
        # A simpler model: Homography decomposition
        # H = K * (R - t*n^T/d)
        
        # Let's assume the plane is Z=0.
        # We transform the plane by Grid Params, then view it.
        
        # Grid Transform G:
        # Scale s, Rotation alpha, Translation (tx, ty) relative to center?
        theta = np.radians(rot)
        c, s_ang = np.cos(theta), np.sin(theta)
        
        # Grid to Plane transform (Similarity + Tilt)
        # This is getting complex to separate.
        # Let's try constructing the Homography directly from components.
        
        # Start with Identity plane (u, v)
        # 1. Scale & Rotate
        H1 = np.array([
            [scale * c, -scale * s_ang, 0],
            [scale * s_ang, scale * c, 0],
            [0, 0, 1]
        ])
        
        # 2. Tilt (Perspective)
        # Rotate the plane in 3D:
        # P_new = R_tilt * P_old
        # We essentially sample u,v,0.
        # Then project.
        
        # Let's go Projection -> Image.
        # U, V -> X, Y
        
        # Combined Model:
        # [x, y, 1]^T ~ K * [R_tilt | T_cam] * [u, v, 0, 1]^T
        #             ~ K * [r1 r2 t] * [u, v, 1]^T
        
        # T_cam needs to position the grid in front of the camera.
        # We want the grid origin (0,0) to appear at (tx, ty) in the image.
        # Effectively:
        # 1. Rotate/Scale Grid in 3D (Z=0).
        # 2. Apply Camera Tilt R_cam.
        # 3. Translate by T_cam to put it in view.
        
        # Wait, (tx, ty) are 2D image coordinates of the grid origin.
        # So we align (0,0,0)_grid to ray through (tx, ty).
        
        # Simplified Parametric Homography:
        # Center the grid at (0,0).
        # Rotate by rot.
        # Scale by scale.
        # Apply tilts (homography warp).
        # Translate to (tx, ty).
        
        # Shift to center
        H_center = np.array([
            [1, 0, -cx],
            [0, 1, -cy],
            [0, 0, 1]
        ])
        
        # The core warp H_tilt
        # A rotation of the plane normal vector.
        # Normal n = [sin(ry), -sin(rx), cos(rx)cos(ry)] approx?
        # Let's use the explicit K * R * K_inv approximation for small tilts?
        # Or just build the matrix.
        
        # Let's stick to the physical model:
        # Plane Point (u, v, 0).
        # 1. Scale/Rot in plane: (u', v') 
        # 2. Tilt Rotation R (3x3).
        # 3. Translation T = [dx, dy, dist].
        # 4. Project K.
        
        # Construct H columns:
        # h1 = K * (R * [s*c, s*s, 0]^T)
        # h2 = K * (R * [-s*s, s*c, 0]^T)
        # h3 = K * T
        
        # But we want T such that (0,0) projects to (tx, ty).
        # h3 ~ [tx, ty, 1]
        # So h3 = w * [tx, ty, 1].
        
        # Let's fix T_z (distance) to 1.0 (absorb into scale/focal).
        # Actually Focal Length interacts with Distance.
        # Let's fix Distance = f (so magnification = 1 at center).
        dist = f
        
        # Rotation R = R_cam
        col1 = R_cam[:, 0] # X axis orientation
        col2 = R_cam[:, 1] # Y axis orientation
        
        # Grid Rotation within plane
        # u_vec = [c, s, 0]
        # v_vec = [-s, c, 0]
        
        dir_u = R_cam @ np.array([c, s_ang, 0])
        dir_v = R_cam @ np.array([-s_ang, c, 0])
        
        # Translation: 
        # We want origin to be at image (tx, ty).
        # Ray trough (tx, ty): K_inv * [tx, ty, 1].
        # T_cam = dist * Ray / Ray_z ?
        # If we fix plane distance.
        # Let's say T_cam = [X, Y, f].
        # Then proj(T_cam) = (X/f * f + cx, ...) = X + cx.
        # So X = tx - cx.
        # T_cam = [tx - cx, ty - cy, f] (roughly).
        
        T_cam = np.array([tx - cx, ty - cy, f])
        
        # Construct Homography Columns
        # H maps (u, v, 1) to (x, y, 1)
        # H = K * [s * dir_u, s * dir_v, T_cam]
        
        # This H assumes u,v are integers in grid space.
        
        M = np.column_stack([scale * dir_u, scale * dir_v, T_cam])
        H = K @ M
        
        return H

    def project_grid_lines(self, w, h, grid_range=20):
        H = self.get_homography(w, h)
        
        lines = []
        
        # Generate triangular grid lines in range [-N, N]
        # 3 Axes: 
        # 1. Horizontal (y = const) -> in hex grid this is one axis.
        # 2. 60 deg
        # 3. 120 deg
        
        # Actually triangular grid lines are:
        # u = const
        # v = const
        # u - v = const? No.
        # Let's define the basis vectors.
        # e1 = (1, 0)
        # e2 = (0.5, sqrt(3)/2)
        # e3 = (-0.5, sqrt(3)/2)
        
        # In our "square" parameter space (u,v):
        # We used u_vec, v_vec orthogonal.
        # This makes a SQUARE grid.
        # To get TRIANGULAR grid, we need to distort the input logic.
        # Or, we just draw the lines corresponding to triangular geometry on the "Square" plane?
        # Yes.
        
        # Ideally, we map integer coords (i, j) to locations.
        # Triangular Basis:
        # P(i, j) = i * e1 + j * e2
        # where e1=(1,0), e2=(cos60, sin60).
        
        # Our Homography H maps (u, v) -> Image.
        # If H handles the affine skew, we can feed it integer (i, j).
        # But our H construction assumed orthogonal u, v (Rotation).
        # So we should input (u, v) coordinates of the triangle vertices.
        
        # Grid Points:
        # P_ij = i * (1, 0) + j * (0.5, 0.866)
        
        # Lines:
        # 1. j = const (Time horizontal) -> u increases.
        #    Start: (-N, j) -> End: (N, j) in (u,v) space?
        #    Line: P(t) = P(-N, j) + t * e1
        # 2. i = const 
        #    Line: P(t) = P(i, -N) + t * e2
        # 3. i + j = const (The 3rd axis)
        
        N = grid_range
        
        pts_src = []
        seg_indices = []
        
        idx = 0
        
        # Axis 1: j = const
        for j in range(-N, N+1):
            # Line from i=-N to i=N
            p1 = np.array([-N, 0]) + j * np.array([0.5, np.sqrt(3)/2])
            p2 = np.array([N, 0]) + j * np.array([0.5, np.sqrt(3)/2])
            pts_src.append(p1)
            pts_src.append(p2)
            seg_indices.append((idx, idx+1))
            idx += 2
            
        # Axis 2: i = const
        for i in range(-N, N+1):
            # Line from j=-N to j=N
            p1 = i * np.array([1, 0]) + -N * np.array([0.5, np.sqrt(3)/2])
            p2 = i * np.array([1, 0]) + N * np.array([0.5, np.sqrt(3)/2])
            pts_src.append(p1)
            pts_src.append(p2)
            seg_indices.append((idx, idx+1))
            idx += 2
            
        # Axis 3: i + j = const (k)
        # i + j = k => j = k - i
        # This corresponds to lines at 120 deg?
        # Let's verify. e1, e2. e3 = e2 - e1 = (-0.5, 0.866).
        # Yes.
        for k in range(-2*N, 2*N+1):
             # Endpoints where i or j is at bounds?
             # Just draw long lines.
             # vector e3.
             # center roughly at k * e2/2 ? no.
             # P(t) = point_on_axis + t * e3
             # finding a point: if i=k, j=0. P = k*e1.
             p1 = k * np.array([1, 0]) + -N * np.array([-0.5, np.sqrt(3)/2])
             p2 = k * np.array([1, 0]) + N * np.array([-0.5, np.sqrt(3)/2])
             pts_src.append(p1)
             pts_src.append(p2)
             seg_indices.append((idx, idx+1))
             idx += 2

        # Project all points
        pts_src = np.array(pts_src, dtype=np.float32)
        # Reshape for cv2.perspectiveTransform: (N, 1, 2)
        pts_src_r = pts_src.reshape(-1, 1, 2)
        
        pts_dst = cv2.perspectiveTransform(pts_src_r, H).reshape(-1, 2)
        
        segments = []
        for i, j in seg_indices:
            segments.append((pts_dst[i], pts_dst[j]))
            
        return segments

    def draw_grid(self, img, color=(0, 255, 0), thickness=1):
        h, w = img.shape[:2]
        segments = self.project_grid_lines(w, h)
        
        vis = img.copy()
        for p1, p2 in segments:
            pt1 = (int(p1[0]), int(p1[1]))
            pt2 = (int(p2[0]), int(p2[1]))
            # Clip roughly? cv2.line handles coords off screen
            cv2.line(vis, pt1, pt2, color, thickness, cv2.LINE_AA)
            
        return vis
