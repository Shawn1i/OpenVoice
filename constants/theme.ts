export const Colors = {
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceSecondary: "#EFEBE3",
  textPrimary: "#3A3530",
  textSecondary: "#7C756D",
  primary: "#C2A889",
  primaryHover: "#A68E71",
  accent: "#8B9D83",
  border: "#E0D9CF",
  error: "#C0614A",
  shadow: "rgba(58, 53, 48, 0.06)",
};

export const Typography = {
  heading: {
    fontFamily: "System",
    fontWeight: "700" as const,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: "System",
    fontWeight: "400" as const,
    color: Colors.textPrimary,
  },
  secondary: {
    fontFamily: "System",
    fontWeight: "400" as const,
    color: Colors.textSecondary,
  },
};

export const Shadows = {
  card: {
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  mic: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
};
