# 🎮 Player Controller - Blueprint Extension

A powerful extension for the Pterodactyl Panel (via Blueprint) that allows you to manage players directly from the panel. No more tedious typing of commands in the console – manage your community with a modern and intuitive user interface.

![Player Controller Logo](icon.png)

## ✨ Features

*   **Real-time Player List**: Automatic synchronization with the server via socket connection.
*   **Detailed Player Info**:
    *   UUID & Avatar (Skin preview)
    *   IP Address (with on-demand obfuscation)
    *   Position (World/Dimension)
    *   Status values (Health, Hunger)
*   **Moderation Tools**:
    *   **Kick & Ban**: With optional reason directly from the UI.
    *   **OP / Deop**: Easy management of operator rights.
*   **Deep Scan**: Reads detailed NBT data of the player directly from the server.
*   **Search Function**: Find players in fractions of a second.
*   **Native Integration**: Seamlessly integrates into the Pterodactyl navigation.

## 🚀 Installation

To install this extension, you need the [Blueprint Framework](https://blueprint.zip).

1.  Download the `.blueprint` file.
2.  Upload it to your Pterodactyl main directory.
3.  Run the Blueprint installation command:
    ```bash
    blueprint -i playercontroller
    ```

## 🛠️ Technical Details

*   **Framework**: Blueprint (Beta-2026-01 compatible)
*   **Frontend**: React, styled-components, TailwindCSS (via twin.macro)
*   **Backend**: Laravel (PHP)
*   **Communication**: Real-time data extraction from console output.

## 📄 License

This project is licensed under the [GPL-3.0 License](LICENSE).

---