# Endeavor GCSI Procedure Room Recording System

<p align="center">
  <img src="https://github.com/jchen6589/Endeavor-GCSI-Procedure-Room-Recording-System/blob/89dbea679ea6eb3aadbca6f167a47dc4baf14a36/assets/icons/app%20screenshot.png?raw=true" width="70%" height="70%">
</p>

The **Endeavor GCSI Procedure Room Recording System** was developed to support self-directed procedural practice and feedback for medical trainees at Endeavor Health Evanston Hospital's GCSI Lab. With medical students, residents, and attendings' busy schedules, coordinating in-person feedback sessions with facilitators can be challenging.

This system provides a secure, user-friendly desktop application (plus a few supplementary software and hardware components) that enables trainees to record themselves from multiple camera angles, then share their recordings with facilitators for asynchronous feedback—maximizing flexibility without compromising quality of feedback.

## Key Features

- 🔴 Minimal input required from students to record and save videos  
- 🎥 Support for multiple adjustable camera angles  
- 💾 Recordings saved in .mp4 format for easy playback  
- 🖱️ Drag and resize video feeds within the UI  
- 🧾 Files are auto-named using student information for easy organization  
- 🔐 Simulated kiosk mode to prevent cross-user access to personal data  

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript  
- **Framework**: Electron Forge  

## Required Materials

To use the system, you’ll need the following:

- A computer with internet access  
- Multiple video sources (e.g., webcams, iPads)  
- Access to the GCSI shared drive  
- An encrypted USB drive for secure file transfer  

## Getting Started

1. Download the latest `Setup.exe` and `lockdown.exe` from the [Releases](https://github.com/your-repo/releases) page.  
2. Configure both files to run on system startup.  
3. Set up the recording environment: plug in webcams, prep procedural equipment, etc.  
4. Allow students to record independently.  
5. Transfer recordings to the GCSI shared drive.  
6. Notify facilitators that recordings are ready for review.

📄 For more detailed setup steps, refer to the **"Instructions for Use"** document in the **Important Documents** folder.

## Known Issues & Future Improvements

- **Kiosk Mode**: Current kiosk simulation prevents most misuse but is not foolproof. A more secure implementation using Windows Enterprise Shell Launcher (requires a computer running Windows Enterprise software) is recommended for future iterations.
- **Camera Ports**: Systems may lack sufficient USB ports for multiple cameras. Consider using a USB hub.
- **Single Stream Output**: Currently, the app records a single video containing all camera streams. If individual video files for each camera stream are needed, the code will require modification.

## Contributing & Alternate Use Cases

This system was originally designed for use in the GCSI Procedure Room but is adaptable for other educational or training scenarios.

If the system as is doesn't suit your needs, you're welcome to:

- Fork the repository for your own setup  
- Submit a feature request or bug report  
- Create a pull request to contribute improvements  
- Reach out directly via email with questions or suggestions!

## Author

**John Chen**  
Endeavor GCSI Innovation Lab Associate (2025)  
📧 johnchen2024@u.northwestern.edu

## Acknowledgements

Special thanks to the following GCSI team members:

- Dan Tarchala  (Innovation Lab Specialist)
- John Cram  (Medical Simulation Program Manager)
- Todd Zimmerman (Simulation Fellow)
- Joy Layton  (Simulation Lab Technician)
